#!/usr/bin/env bash
# diagram-gates-selftest.sh — Chạy lại toàn bộ gate "vẽ đúng" của họ skill diagram.
#
# CHẠY SAU MỖI LẦN sửa linter/semcheck — mục đích là chứng minh 2 chiều:
#   (a) file SAI thật sự bị CHẶN (không phải linter chỉ in cảnh báo rồi cho qua)
#   (b) file ĐÚNG KHÔNG bị chặn oan (false positive làm skill không dùng được)
# Fixture "phải FAIL" là test hồi quy cho các lỗi ĐÃ XẢY RA THẬT — đừng sửa chúng cho pass.
#
# Dùng: bash .claude/scripts/diagram-gates-selftest.sh
# Exit 0 = mọi gate hoạt động đúng · 1 = có gate hỏng.

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 2
PASS=0; FAIL=0

chk() { # chk <tên> <exit thật> <exit mong đợi>
  if [ "$2" = "$3" ]; then printf "  ✅ %s\n" "$1"; PASS=$((PASS+1))
  else printf "  ❌ %s (mong exit %s, nhận %s)\n" "$1" "$3" "$2"; FAIL=$((FAIL+1)); fi
}

echo "══════ Gate ngữ pháp use case (puml-usecase-lint) ══════"
UL=.claude/skills/usecase-diagram/puml-usecase-lint.mjs
UF=.claude/skills/usecase-diagram/fixtures
node $UL $UF/valid-basic.puml       >/dev/null 2>&1; chk "file đúng → PASS"                       $? 0
node $UL $UF/invalid-6-lois.puml    >/dev/null 2>&1; chk "6 lỗi thật → FAIL"                      $? 1
node $UL $UF/invalid-direction.puml >/dev/null 2>&1; chk "sai hướng (cú pháp đúng) → chỉ cảnh báo" $? 0

echo "══════ Gate cấu trúc luồng swimlane (puml-activity-lint) ══════"
AL=.claude/skills/activity-swimlane/puml-activity-lint.mjs
AF=.claude/skills/activity-swimlane/fixtures
node $AL $AF/valid-swimlane.puml   >/dev/null 2>&1; chk "luồng đúng → PASS"                   $? 0
node $AL $AF/invalid-swimlane.puml >/dev/null 2>&1; chk "thiếu endif/loose-end → FAIL"        $? 1

echo "══════ Gate IR nghiệp vụ BPMN (bpmn-semcheck) ══════"
SC=.claude/skills/bpmn/engine/bpmn-semcheck.mjs
TMP=$(mktemp -d)
cat > "$TMP/bad.json" <<'JSON'
{"process":{"id":"P"},"lanes":[{"id":"L","name":"A"}],
 "nodes":[{"id":"S1","kind":"start","name":"a","lane":"L"},{"id":"S2","kind":"start","name":"b","lane":"L"},
          {"id":"T","kind":"task","name":"t","lane":"L"},{"id":"T","kind":"task","name":"trùng","lane":"L"},
          {"id":"G","kind":"gateway","name":"g?","lane":"L"},{"id":"E","kind":"end","name":"e","lane":"L"}],
 "flows":[{"id":"f1","src":"S1","tgt":"T"},{"id":"f2","src":"S2","tgt":"T"},{"id":"f3","src":"T","tgt":"G"},
          {"id":"f4","src":"G","tgt":"E"},{"id":"f5","src":"G","tgt":"T"}]}
JSON
cat > "$TMP/loop.json" <<'JSON'
{"process":{"id":"P"},"lanes":[{"id":"L","name":"A"}],
 "nodes":[{"id":"S","kind":"start","name":"s","lane":"L"},{"id":"D","kind":"task","name":"nháp","lane":"L"},
          {"id":"R","kind":"task","name":"duyệt","lane":"L"},{"id":"G","kind":"gateway","name":"đạt?","lane":"L"},
          {"id":"E","kind":"end","name":"xong","lane":"L"}],
 "flows":[{"id":"f1","src":"S","tgt":"D"},{"id":"f2","src":"D","tgt":"R"},{"id":"f3","src":"R","tgt":"G"},
          {"id":"f4","src":"G","tgt":"E","name":"đạt"},{"id":"f5","src":"G","tgt":"D","name":"cần sửa"}]}
JSON
node $SC "$TMP/bad.json"  >/dev/null 2>&1; chk "2 start + id trùng + nhánh không nhãn → FAIL" $? 1
node $SC "$TMP/loop.json" >/dev/null 2>&1; chk "loop hợp lệ → PASS (không bắt oan)"           $? 0
rm -rf "$TMP"
for ir in docs/*/bpmn/*.ir.json; do
  [ -f "$ir" ] || continue
  src="${ir%.ir.json}.src.json"
  node $SC "$ir" $([ -f "$src" ] && echo "$src") >/dev/null 2>&1
  chk "IR thật: $(basename "$ir") → PASS" $? 0
done

echo "══════ Gate mermaid 3 lớp (mermaid-verify) ══════"
MV=.claude/scripts/mermaid-verify.mjs
MF=.claude/scripts/fixtures
node $MV --file $MF/mermaid-valid-flow.md    >/dev/null 2>&1; chk "label quote đúng → PASS (không chặn oan)" $? 0
node $MV --file $MF/mermaid-escaped-quot.md  >/dev/null 2>&1; chk "&quot; escape tầng hiển thị → FAIL"        $? 1
# Chẩn đoán phải CHỈ ĐÚNG nguyên nhân, không chỉ FAIL chung chung — nếu mất dòng này thì
# người đọc lại đi sửa file .md đang đúng (đúng cái vòng lặp mà ca 2026-08-01 gây ra).
node $MV --file $MF/mermaid-escaped-quot.md 2>&1 | grep -q "ĐỪNG sửa file .md đang đúng"
chk "báo &quot; kèm chỉ dẫn sửa lớp render" $? 0

echo "══════ Gate đối chiếu 3 bản ERD (erd-consistency) ══════"
for d in docs/*/; do
  fe=$(basename "$d")
  [ -f "docs/$fe/srs/$fe-erd.md" ] || continue
  if [ -f "docs/$fe/d2-erd/$fe.d2" ] || [ -f "docs/$fe/dbdiagram/$fe.dbml" ]; then
    node .claude/scripts/erd-consistency.mjs --feature "$fe" >/dev/null 2>&1
    chk "$fe: chạy được (có bản phái sinh)" $? 0
  else
    node .claude/scripts/erd-consistency.mjs --feature "$fe" >/dev/null 2>&1
    chk "$fe: chỉ có canonical → OK" $? 0
  fi
done

echo "════════════════════════════════════════"
printf "  %s PASS / %s FAIL\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && echo "  Mọi gate hoạt động đúng 2 chiều (chặn cái sai, không chặn oan cái đúng)."
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
