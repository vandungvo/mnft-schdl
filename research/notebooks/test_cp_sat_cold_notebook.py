"""Short local checks for the standalone notebook; no Colab account required.

Run: python -m unittest research.notebooks.test_cp_sat_cold_notebook -v
"""
import base64
import contextlib
import hashlib
import io
import json
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from ortools.sat.python import cp_model

from models.common.instance import digest
from models.common.stage_runs import cp_engine
from models.common.stage_runs.evaluate import evaluate, validate
from research.notebooks.build_cp_sat_cold_2weeks import FILES, KAGGLE_OUTPUT, OUTPUT, ROOT, build
from research.notebooks.cp_sat_cold_runner import run


class NotebookChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        build()
        cls.notebook = json.loads(OUTPUT.read_text(encoding="utf-8"))
        cls.sources = {cell["id"]: "".join(cell["source"]) for cell in cls.notebook["cells"]}
        cls.tmp_root = ROOT / ".test-tmp"
        cls.tmp_root.mkdir(exist_ok=True)

    def test_notebook_cells_and_embedded_sources(self):
        self.assertEqual(self.notebook["nbformat"], 4)
        kaggle = json.loads(KAGGLE_OUTPUT.read_text(encoding="utf-8"))
        self.assertEqual(kaggle["cells"], self.notebook["cells"])
        ids = [cell["id"] for cell in self.notebook["cells"]]
        self.assertEqual(len(ids), len(set(ids)))
        for cell in self.notebook["cells"]:
            if cell["cell_type"] == "code":
                compile("".join(cell["source"]), cell["id"], "exec")
                self.assertEqual(cell["outputs"], [])
                self.assertIsNone(cell["execution_count"])
        import ast
        tree = ast.parse(self.sources["bundle"])
        constants = {node.targets[0].id: ast.literal_eval(node.value) for node in tree.body
                     if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
                     and node.targets[0].id in ("BUNDLE_SHA256", "BUNDLE_BASE64")}
        payload = base64.b64decode(constants["BUNDLE_BASE64"])
        self.assertEqual(hashlib.sha256(payload).hexdigest(), constants["BUNDLE_SHA256"])
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            self.assertEqual(set(archive.namelist()), set(FILES) | {"bundle_manifest.json"})
            for name in FILES:
                self.assertEqual(archive.read(name), (ROOT / name).read_bytes(), name)

    def test_colab_cells_run_standalone_and_export_unknown(self):
        self._execute_notebook()

    def test_kaggle_cells_export_to_working_without_colab(self):
        self._execute_notebook(kaggle=True)

    def _execute_notebook(self, kaggle=False):
        # Execute the actual notebook cells with a tiny budget in an isolated cwd.
        with tempfile.TemporaryDirectory(dir=self.tmp_root) as temporary:
            old_cwd = Path.cwd()
            namespace = {"__name__": "__main__"}
            try:
                os.chdir(temporary)
                for cell_id in ("install", "config", "bundle", "solve", "results", "download"):
                    source = self.sources[cell_id]
                    if cell_id == "config":
                        source = source.replace("HOURS = 12.0", "HOURS = 0.00001")
                        source = source.replace("REQUESTED_WORKERS = 0", "REQUESTED_WORKERS = 1")
                        if kaggle:
                            source = source.replace('Path("/kaggle/working")', "Path.cwd()")
                            source = source.replace("SAVE_TO_DRIVE = False", "SAVE_TO_DRIVE = True")
                    with contextlib.redirect_stdout(io.StringIO()):
                        exec(compile(source, cell_id, "exec"), namespace)  # noqa: S102 - execute our generated notebook cells
                result = namespace["result"]
                self.assertEqual(result["status"], "UNKNOWN")
                self.assertFalse(result["has_schedule"])
                self.assertFalse(result["use_hint"])
                self.assertIsNone(result["hint_source"])
                self.assertEqual(result["input_sha256"], digest(namespace["data"]))
                output = namespace["OUTPUT_DIR"]
                self.assertEqual(output.parent, Path(temporary) / "cp_sat_cold_2weeks")
                self.assertLessEqual(result["budget_seconds"], .0361)
                if kaggle:
                    self.assertTrue(namespace["IS_KAGGLE"])
                    self.assertFalse(namespace["USE_DRIVE"])
                self.assertFalse((output / "schedule.json").exists())
                self.assertTrue((output / "solver.log").is_file())
                self.assertTrue((output / "source_bundle.zip").is_file())
                with zipfile.ZipFile(namespace["ZIP_PATH"]) as archive:
                    self.assertIn("result.json", archive.namelist())
                    self.assertNotIn("schedule.json", archive.namelist())
            finally:
                os.chdir(old_cwd)

    def test_session_budget_subtracts_setup_and_reserves_export_time(self):
        namespace = {}
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(self.sources["config"], "config", "exec"), namespace)  # noqa: S102 - own notebook cell
        budget = namespace["solver_budget_seconds"]
        self.assertEqual(namespace["HOURS"], 12)
        self.assertEqual(namespace["WORKERS"], namespace["available_cpus"])
        self.assertEqual(budget(12, 100, 100), 11 * 3600 + 50 * 60)
        self.assertEqual(budget(12, 100, 400), 11 * 3600 + 45 * 60)
        self.assertEqual(budget(24, 100, 400), 11 * 3600 + 45 * 60)
        self.assertEqual(budget(2, 100, 400), 2 * 3600)
        self.assertEqual(budget(12, 100, 100 + 11 * 3600), 50 * 60)
        with self.assertRaises(RuntimeError):
            budget(12, 100, 100 + 12 * 3600)

    def test_actual_model_has_no_solution_hint(self):
        data = json.loads((ROOT / "dataset/wheel-factory-2weeks/model_input.json").read_text(encoding="utf-8"))
        inspected = []
        original_solve = cp_model.CpSolver.solve

        def inspect(solver, model, callback):
            inspected.append(len(model.proto.solution_hint.vars))
            return original_solve(solver, model, callback)

        with patch.object(cp_model.CpSolver, "solve", inspect):
            rows, meta = cp_engine.solve(data, seconds=.01, hint=None, fixed_runs=None,
                                         limits=None, workers=1, seed=11)
        self.assertEqual(inspected, [0])
        self.assertIsNone(rows)
        self.assertEqual(meta["status"], "UNKNOWN")

    def test_feasible_artifacts_use_independent_validator(self):
        # Exercise exports with the repository's known valid schedule. This is
        # a mocked solver return, never a hint sent to a real cold solver.
        input_path = ROOT / "dataset/wheel-factory-small/model_input.json"
        data = json.loads(input_path.read_text(encoding="utf-8"))
        rows = json.loads((input_path.parent / "manual_schedule.json").read_text(encoding="utf-8"))["schedule"]
        score = evaluate(data, rows)[0]["objective"]
        self.assertTrue(validate(data, rows)["valid"])
        meta = {"status": "FEASIBLE", "solver_objective": score, "bound": 0,
                "history": [], "response_stats": "test fixture"}
        with tempfile.TemporaryDirectory(dir=self.tmp_root) as temporary:
            output = Path(temporary) / "run"
            with patch("research.notebooks.cp_sat_cold_runner.solve", return_value=(rows, meta)) as solver:
                result = run(input_path, output, .01, 1, 11)
            self.assertIsNone(solver.call_args.kwargs["hint"])
            self.assertIsNone(solver.call_args.kwargs["fixed_runs"])
            self.assertTrue(result["validation"]["valid"])
            for name in ("schedule.json", "schedule.csv", "gantt.html", "REPORT.md", "results.json"):
                self.assertTrue((output / name).is_file(), name)
            with self.assertRaises(FileExistsError):
                run(input_path, output, .01, 1, 11)


if __name__ == "__main__":
    unittest.main()
