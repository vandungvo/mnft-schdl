from __future__ import annotations

import argparse
import csv
import html
import hashlib
import json
import platform
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import ortools
from .instance import ROOT, DEFAULT_INPUT, load, digest, save_json
from .decoder import decode
from .evaluate import evaluate, validate

METHODS = ["fifo", "edd", "spt", "simulated_annealing", "genetic_algorithm", "cp_sat", "cp_sat_hint", "cp_lns", "cp_rolling"]
V2_ONLY = {"cp_rolling"}  # rolling-horizon CP-SAT exists for the schema-5 engine only


def methods_for(data):
    return [m for m in METHODS if _schema5(data) or m not in V2_ONLY]


def _schema5(data):
    return data.get("schema_version") == 5


def runs_root(data):
    """Saved runs are kept per model version: runs/v2 (schema 5), runs/v1 (older schemas)."""
    return ROOT/"runs"/("v2" if _schema5(data) else "v1")


def _engine(data):
    """(validate, evaluate, gantt) for the input's schema."""
    if _schema5(data):
        from .stage_runs import evaluate as ev5
        from .stage_runs.report import gantt as gantt5
        return ev5.validate, ev5.evaluate, gantt5
    return validate, evaluate, gantt


def execute(data, method, seconds, seed):
    if _schema5(data):
        from .stage_runs.experiment import execute as execute5
        return execute5(data, method, seconds, seed)
    if method in V2_ONLY:
        raise ValueError(f"{method} needs a schema-5 input")
    started = time.perf_counter()
    if method in ("fifo","edd","spt"):
        rows = decode(data,rule=method)
        return rows,{"status":"HEURISTIC_FEASIBLE" if rows else "NO_SOLUTION_FOUND","bound":None,"history":[]}
    if method in ("simulated_annealing","genetic_algorithm"):
        from .search import optimize
        return optimize(data,"sa" if method == "simulated_annealing" else "ga",seconds,seed)
    from .cp_engine import solve
    if method == "cp_sat":
        return solve(data,seconds=seconds,seed=seed)
    incumbent = decode(data,"edd")
    if incumbent and not validate(data,incumbent)["valid"]:
        raise ValueError("Invalid EDD hint")
    initial_score = evaluate(data,incumbent)[0]["objective"] if incumbent else None
    if method == "cp_sat_hint":
        rows,meta = solve(data,seconds=max(.01,seconds-(time.perf_counter()-started)),seed=seed,hint=incumbent)
        meta["solver_status"] = meta["status"]
        meta["initial_hint_objective"] = initial_score
        if incumbent and (rows is None or evaluate(data,rows)[0]["objective"] > initial_score):
            rows = incumbent
            meta["status"] = "HEURISTIC_FALLBACK"
            meta.pop("solver_objective",None)
            # Solver may have a valid global bound, but UNKNOWN is not claimed infeasible.
        meta["history"].insert(0,{"seconds":0,"objective":initial_score,"source":"EDD"})
        return rows,meta
    rng = random.Random(seed)
    if incumbent is None:
        return None,{"status":"NO_SOLUTION_FOUND","history":[],"bound":None}
    best_score = initial_score
    history = [{"seconds":time.perf_counter()-started,"objective":best_score,"source":"EDD"}]
    iterations = []
    while seconds-(time.perf_counter()-started) > 3:
        # Random whole-lot neighborhood; every stage of released lots may move.
        released = set(rng.sample([l["id"] for l in data["lots"]], max(4,len(data["lots"])//5)))
        fixed = {l["id"] for l in data["lots"]}-released
        remaining = seconds-(time.perf_counter()-started)
        rows,meta = solve(data,seconds=min(10,remaining),seed=seed+len(iterations),hint=incumbent,fixed_lots=fixed)
        iterations.append({"released_lots":sorted(released),"status":meta["status"],"build_seconds":meta["build_seconds"],"solve_seconds":meta["solve_seconds"]})
        if rows:
            check = validate(data,rows)
            if not check["valid"]:
                raise ValueError(check)
            value = evaluate(data,rows)[0]["objective"]
            if abs(value-meta["solver_objective"]) > .01:
                raise ValueError("LNS objective disagrees with independent evaluator")
            if value < best_score:
                incumbent,best_score = rows,value
                history.append({"seconds":time.perf_counter()-started,"objective":value,"iteration":len(iterations)})
    return incumbent,{"status":"HEURISTIC_FEASIBLE","history":history,"iterations":iterations,
                      "bound":None,"bound_scope":"none; neighborhood bounds are not global",
                      "initial_hint_objective":initial_score}


def write_csv(path, rows):
    if not rows:
        return
    with Path(path).open("w",encoding="utf-8-sig",newline="") as handle:
        writer = csv.DictWriter(handle,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def gantt(path, data, rows, result):
    colors = {"F_SILVER":"#38bdf8","F_BLACK":"#2563eb","R_SILVER":"#fb923c","R_BLACK":"#ea580c"}
    products = {l["id"]:l["product"] for l in data["lots"]}
    machine_ids = list(data["machines"])
    max_time = data["horizon"]
    width,left,scale = 1600,130,1450/max_time
    content = []
    for i,mid in enumerate(machine_ids):
        y = 50+i*68
        content.append(f'<text x="5" y="{y+25}">{mid}</text>')
        for w in data["machines"][mid]["windows"]:
            content.append(f'<rect x="{left+w["start"]*scale}" y="{y}" width="{(w["end"]-w["start"])*scale}" height="45" fill="#edf2f7"/>')
        for r in rows:
            if r["machine"] != mid:
                continue
            parts = [(r["block_start"],r["maintenance_minutes"],"#a855f7","maintenance"),
                     (r["start"]-r["setup_minutes"],r["setup_minutes"],"#475569","setup"),
                     (r["start"],r["end"]-r["start"],colors[products[r["lot"]]],"processing")]
            for start,length,color,kind in parts:
                if length:
                    title = html.escape(f'{r["lot"]} {products[r["lot"]]} {kind}: {start}–{start+length} min; {r["shift"]}')
                    content.append(f'<rect x="{left+start*scale}" y="{y+5}" width="{max(.6,length*scale)}" height="35" fill="{color}"><title>{title}</title></rect>')
    for day in range(15):
        x = left+day*1440*scale
        content.append(f'<line x1="{x}" x2="{x}" y1="35" y2="530" stroke="#cbd5e1"/><text x="{x}" y="25">D{day+1}</text>')
    path.write_text('<!doctype html><meta charset="utf-8"><title>Scheduling Gantt</title><style>body{font:14px system-ui;margin:28px;color:#172033}svg{min-width:1600px}section{overflow:auto}pre{white-space:pre-wrap}</style>'
                    +f'<h1>{html.escape(result["method"])} · seed {result["seed"]}</h1><p>Hover over bars for lot/time. Purple: maintenance; grey: setup; blue: front wheels; orange: rear wheels. Day 1 = 2026-09-21, minutes are wall-clock.</p>'
                    +'<section><svg width="1600" height="550">'+''.join(content)+'</svg></section><pre>'
                    +html.escape(json.dumps(result.get("metrics"),indent=2,ensure_ascii=False))+'</pre>',encoding="utf-8")


def run_one(method, input_path=DEFAULT_INPUT, seconds=30, seed=11, run_id=None):
    data = load(input_path)
    run_id = run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = runs_root(data)/method/"results"/run_id/f"seed_{seed}"
    output.mkdir(parents=True,exist_ok=True)
    if (output/"result.json").exists():
        raise FileExistsError(f"Refusing to overwrite saved run: {output}")
    started = time.perf_counter()
    rows,meta = execute(data,method,seconds,seed)
    algorithm_seconds = time.perf_counter()-started
    sources = {p.relative_to(ROOT).as_posix(): p.read_text(encoding="utf-8")
               for p in sorted(ROOT.rglob("*.py")) if "results" not in p.parts and "runs" not in p.relative_to(ROOT).parts}
    code_hash = hashlib.sha256(json.dumps(sources,sort_keys=True).encode()).hexdigest()
    save_json(output/"source_snapshot.json",sources)
    result = {"method":method,"seed":seed,"run_id":run_id,"input_sha256":digest(data),"code_sha256":code_hash,
              "budget_seconds":seconds,"algorithm_seconds":algorithm_seconds,
              "environment":{"python":sys.version,"ortools":ortools.__version__,"platform":platform.platform(),
                             "processor":platform.processor(),"workers":1},**meta}
    check, score_of, draw = _engine(data)
    result["validation"] = check(data,rows) if rows else {"valid":False,"errors":["No schedule returned"]}
    if rows:
        metrics,details = score_of(data,rows)
        result["metrics"] = metrics
        if "solver_objective" in meta and abs(metrics["objective"]-meta["solver_objective"]) > .01:
            raise ValueError(f"Solver/evaluator objective mismatch: {metrics['objective']} != {meta['solver_objective']}")
        if not result["validation"]["valid"]:
            save_json(output/"invalid_schedule.json",rows)
            save_json(output/"result.json",result)
            raise ValueError(result["validation"])
        bound = meta.get("bound")
        result["gap"] = max(0,(metrics["objective"]-bound)/max(1,abs(metrics["objective"]))) if bound is not None else None
        save_json(output/"schedule.json",rows)
        write_csv(output/"schedule.csv",rows)
        for name,records in details.items():
            write_csv(output/f"{name}.csv",records)
        draw(output/"gantt.html",data,rows,result)
    result["total_seconds"] = time.perf_counter()-started
    save_json(output/"result.json",result)
    save_json(output/"input.json",data)
    (output/"solver.log").write_text(meta.get("response_stats",json.dumps(meta,indent=2)),encoding="utf-8")
    score = result.get("metrics",{}).get("objective")
    print(f"{method} seed={seed} status={result['status']} valid={result['validation']['valid']} objective={score} time={algorithm_seconds:.2f}s",flush=True)
    return result,output


def entry(method):
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,default=DEFAULT_INPUT)
    parser.add_argument("--seconds",type=float,default=30)
    parser.add_argument("--seed",type=int,default=11)
    args = parser.parse_args()
    run_one(method,args.input,args.seconds,args.seed)
