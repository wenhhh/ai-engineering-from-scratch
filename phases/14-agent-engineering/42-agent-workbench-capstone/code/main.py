"""将综合项目的 agent-workbench-pack 组装到 outputs/ 目录。

汇集前面工作台课程的模式定义、脚本和文档，重复运行会按模板覆盖同名产物，
并打印生成的文件树。模板中的人类可读文本与已交付的中文工作台包保持同步。

译注：这是简化教学包，不是完整生产实现。反馈脚本没有脱敏和轮转；验证器缺少覆盖率、
严格模式及签名例外，而且在全部输入缺失时可能因空列表而返回通过。交接协议中的结束钩子
并未安装；安装器也不会创建状态和看板数据。看板模式使用 acceptance，而范围契约使用
acceptance_criteria，使用时应分别遵循各自字段定义。

安装器只对 AGENTS.md 检查 --force；复制其他目录时仍会覆盖同名文件。不要把它直接用于
带有未提交改动的工作区，应先在临时仓库或备份中验证。此处保留原逻辑，仅补译并说明边界。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).parent
PACK = HERE.parent / "outputs" / "agent-workbench-pack"

PACK_VERSION = "1.0.0"


AGENTS_MD = """# AGENTS.md

你正在使用智能体工作台的仓库中工作。

行动前阅读以下内容：

1. `agent_state.json`：上次会话停在哪里。
2. `task_board.json`：正在进行什么，接下来做什么。
3. `docs/agent-rules.md`：启动、禁止事项、完成、不确定性、审批。
4. `docs/reliability-policy.md`：工作台旨在应对的失败模式。
5. `docs/handoff-protocol.md`：会话结束必须产出什么。
6. `docs/reviewer-rubric.md`：如何评判已完成工作。

验证命令：参见看板中当前任务的 `acceptance_criteria`。

包版本：{version}
""".lstrip()


AGENT_RULES_MD = """# 智能体规则（Agent Rules）

## startup/state-file-fresh
- category: startup
- check: state_file_fresh
智能体在任何工具调用前必须读取 agent_state.json。

## forbidden/no-out-of-scope-writes
- category: forbidden
- check: no_out_of_scope_writes
绝不编辑当前任务范围契约之外的文件。

## done/tests-pass
- category: definition_of_done
- check: tests_pass
只有每条验收命令的退出码都为 0，任务才算完成。

## uncertainty/open-question-note
- category: uncertainty
- check: opened_question_when_unsure
置信度低于阈值时，创建问题记录，而不是猜测。

## approval/new-dependency
- category: approval
- check: new_dependency_approved
添加运行时依赖需要人工明确批准。
"""


RELIABILITY_POLICY_MD = """# 可靠性政策（Reliability Policy）

工作台应对行业中反复出现的五种失败模式：

1. 行动幻觉（Hallucinated Action）：由规则集与验证关卡捕获。
2. 范围蔓延（Scope Creep）：由范围契约差异检查捕获。
3. 级联错误（Cascading Errors）：由反馈记录与空退出状态即拒绝机制捕获。
4. 上下文丢失（Context Loss）：依靠仓库记忆缓解；聊天不是事实来源。
5. 工具误用（Tool Misuse）：由审查评分标准中的验证维度捕获。

政策由验证关卡执行。例外放行路径需要签署
并接受审计；智能体不能自行放行。

译注：以上是设计政策。此打包版没有实现签名例外、完整的工具误用检查或全部缺证据拦截；
不能把“政策已写出”当作“运行时已强制执行”的证据。完整机制需结合前几课另行实现和验证。
"""


HANDOFF_PROTOCOL_MD = """# 交接协议（Handoff Protocol）

每次会话结束都必须提供包含以下内容的交接包：

- summary：摘要
- changed_files：变更文件
- commands_run：已运行命令
- failed_attempts：失败尝试
- open_risks：未解决风险（严重度与详情）
- next_action：下一步动作（一个具体步骤）
- verdict_pointer：判定指针（验证与审查报告的路径）

交接包同时提供 handoff.md（供人工）和 handoff.json（供下一个智能体）。
字段缺失会中止会话结束钩子。

译注：本包提供交接生成器，但没有安装会话结束钩子。当前生成器会为空缺输入填默认值，
不会仅因所有上游产物缺失而必然失败；字段与回执完整性仍需单独校验。
"""


REVIEWER_RUBRIC_MD = """# 审查评分标准（Reviewer Rubric）

五个维度，每个维度计 0 至 2 分。

1. 问题匹配度（Problem Fit）：变更是否解决明确提出的任务？
2. 范围纪律（Scope Discipline）：编辑是否限定在契约内？
3. 假设（Assumptions）：隐藏假设是否已写明？
4. 验证质量（Verification Quality）：验收是否真的证明目标？
5. 交接就绪度（Handoff Readiness）：下一次会话能否顺利接手？

总分 >= 7 且无零分：通过（pass）。总分 5–6：软失败（soft fail）。低于 5 或任一零分：硬失败（hard fail）。
"""


STATE_SCHEMA = {
    "$id": "agent_state.schema.json",
    "type": "object",
    "required": ["schema_version", "active_task_id", "touched_files", "next_action"],
    "properties": {
        "schema_version": {"type": "integer", "enum": [1]},
        "active_task_id": {"type": ["string", "null"]},
        "touched_files": {"type": "array", "items": {"type": "string"}},
        "assumptions": {"type": "array", "items": {"type": "string"}},
        "blockers": {"type": "array", "items": {"type": "string"}},
        "next_action": {"type": "string"},
    },
}

BOARD_SCHEMA = {
    "$id": "task_board.schema.json",
    "type": "array",
    "items": {
        "type": "object",
        "required": ["id", "goal", "owner", "acceptance", "status"],
        "properties": {
            "id": {"type": "string", "pattern": r"^T-\d{3,}$"},
            "goal": {"type": "string"},
            "owner": {"type": "string", "enum": ["builder", "reviewer", "human"]},
            "acceptance": {"type": "array", "items": {"type": "string"}, "minItems": 1},
            "status": {"type": "string", "enum": ["todo", "in_progress", "done", "blocked"]},
        },
    },
}

SCOPE_SCHEMA = {
    "$id": "scope_contract.schema.json",
    "type": "object",
    "required": ["task_id", "goal", "allowed_files", "forbidden_files", "acceptance_criteria", "rollback_plan"],
    "properties": {
        "task_id": {"type": "string"},
        "goal": {"type": "string"},
        "allowed_files": {"type": "array", "items": {"type": "string"}},
        "forbidden_files": {"type": "array", "items": {"type": "string"}},
        "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
        "rollback_plan": {"type": "string"},
        "approvals_required": {"type": "array", "items": {"type": "string"}},
    },
}


INSTALL_SH = """#!/usr/bin/env bash
set -euo pipefail

# 将智能体工作台包安装到当前仓库。
# 警告：仅检查 AGENTS.md 的覆盖条件；其余同名目录文件仍可能被 cp 覆盖。
# 用法：bin/install.sh [--force]；请先在临时仓库或备份中试用。

FORCE=\"${1:-}\"
TARGET=\"$(pwd)\"
PACK_ROOT=\"$(cd \"$(dirname \"$0\")/..\" && pwd)\"

required=(\"AGENTS.md\" \"VERSION\" \"docs\" \"schemas\" \"scripts\")
for path in \"${required[@]}\"; do
    if [[ ! -e \"$PACK_ROOT/$path\" ]]; then
        echo \"工作台包缺少源文件：$PACK_ROOT/$path\" >&2
        exit 1
    fi
done

if [[ -e \"$TARGET/AGENTS.md\" && \"$FORCE\" != \"--force\" ]]; then
    echo \"AGENTS.md 已存在；传入 --force 才允许覆盖。\" >&2
    exit 1
fi

cp \"$PACK_ROOT/AGENTS.md\" \"$TARGET/AGENTS.md\"
mkdir -p \"$TARGET/docs\" \"$TARGET/schemas\" \"$TARGET/scripts\"
cp -r \"$PACK_ROOT/docs/.\" \"$TARGET/docs/\"
cp -r \"$PACK_ROOT/schemas/.\" \"$TARGET/schemas/\"
cp -r \"$PACK_ROOT/scripts/.\" \"$TARGET/scripts/\"
cat \"$PACK_ROOT/VERSION\" > \"$TARGET/.workbench-version\"

echo \"已安装工作台包，版本 $(cat \"$PACK_ROOT/VERSION\")\"
echo \"下一步：准备并编辑 task_board.json，设置验收命令，然后运行 scripts/init_agent.py\"
"""


INIT_AGENT_PY = """#!/usr/bin/env python3
\"\"\"工作台初始化脚本。从零实现的过程见阶段 14 第 35 课。

此打包版仅保留运行时、依赖、命令、环境和状态检查，不含课程完整示例的缓存与 LKG 差异检查。
探针名称和 pass/warn/fail 判定保留英文；missing 表示缺失，all importable 表示全部可导入，
no state file yet 表示尚无状态文件。测试命令探针只检查 PATH，不运行真实测试。
\"\"\"

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_PATH = ROOT / \"init_report.json\"
STATE_PATH = ROOT / \"agent_state.json\"
REQUIRED_PYTHON = (3, 10)
REQUIRED_DEPS: list[str] = []
TEST_COMMAND = os.environ.get(\"WORKBENCH_TEST_COMMAND\", \"python3\")
REQUIRED_ENV: list[str] = []
FRESH_SECONDS = 24 * 60 * 60


def _probe_runtime() -> tuple[str, str, str]:
    major, minor = sys.version_info[:2]
    ok = (major, minor) >= REQUIRED_PYTHON
    return (\"runtime\", \"pass\" if ok else \"fail\", f\"python {major}.{minor}\")


def _probe_deps() -> tuple[str, str, str]:
    missing = [d for d in REQUIRED_DEPS if importlib.util.find_spec(d) is None]
    return (\"dependencies\", \"fail\" if missing else \"pass\", f\"missing: {missing}\" if missing else \"all importable\")


def _probe_test_command() -> tuple[str, str, str]:
    return (\"test_command\", \"pass\" if shutil.which(TEST_COMMAND) else \"fail\", f\"{TEST_COMMAND} on PATH\")


def _probe_env() -> tuple[str, str, str]:
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    return (\"env\", \"fail\" if missing else \"pass\", f\"missing: {missing}\" if missing else \"all present\")


def _probe_state() -> tuple[str, str, str]:
    if not STATE_PATH.exists():
        return (\"state_freshness\", \"warn\", \"no state file yet\")
    age = time.time() - STATE_PATH.stat().st_mtime
    if age > FRESH_SECONDS:
        return (\"state_freshness\", \"warn\", f\"state is {int(age // 3600)}h old\")
    return (\"state_freshness\", \"pass\", f\"state is {int(age)}s old\")


def main() -> int:
    probes = [_probe_runtime(), _probe_deps(), _probe_test_command(), _probe_env(), _probe_state()]
    REPORT_PATH.write_text(
        json.dumps(
            {\"timestamp\": time.time(), \"probes\": [{\"name\": n, \"status\": s, \"detail\": d} for n, s, d in probes]},
            indent=2,
        )
        + \"\\n\"
    )
    width = max(len(n) for n, _, _ in probes)
    for name, status, detail in probes:
        print(f\"  {name:<{width}}  {status:>4}  {detail}\")
    failed = [n for n, s, _ in probes if s == \"fail\"]
    if failed:
        print(f\"\\n初始化失败：{failed}\", file=sys.stderr)
        return 1
    return 0


if __name__ == \"__main__\":
    raise SystemExit(main())
"""


RUN_WITH_FEEDBACK_PY = """#!/usr/bin/env python3
\"\"\"结构化命令运行器，参见阶段 14 第 37 课。

记录命令、标准输出与标准错误片段、退出码、耗时及智能体备注。
此打包版没有第 37 课完整示例中的脱敏、日志轮转或父子命令链，不应直接用于含秘密的输出。
command/note/timeout 为命令行参数；JSON 字段和 timeout after 等诊断保持原样。
\"\"\"

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORD = ROOT / \"feedback_record.jsonl\"
HEAD_LINES = 5
TAIL_LINES = 30


def deterministic_tail(text: str) -> tuple[str, int]:
    lines = text.splitlines()
    if len(lines) <= HEAD_LINES + TAIL_LINES:
        return text, 0
    cut = len(lines) - HEAD_LINES - TAIL_LINES
    return \"\\n\".join(lines[:HEAD_LINES] + [f\"...truncated {cut} lines...\"] + lines[-TAIL_LINES:]), cut


def run_with_feedback(command: list[str], agent_note: str = \"\", timeout_s: float = 30.0) -> dict[str, object]:
    started = time.time()
    record: dict[str, object] = {\"command\": command, \"agent_note\": agent_note, \"started_at\": started}
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=timeout_s)
        out, cut_out = deterministic_tail(completed.stdout)
        err, cut_err = deterministic_tail(completed.stderr)
        record.update(
            stdout_tail=out, stderr_tail=err, exit_code=completed.returncode,
            duration_ms=int((time.time() - started) * 1000),
            truncations={\"stdout\": cut_out, \"stderr\": cut_err},
        )
    except subprocess.TimeoutExpired as exc:
        partial_out = exc.stdout.decode(errors=\"replace\") if isinstance(exc.stdout, bytes) else (exc.stdout or \"\")
        partial_err = exc.stderr.decode(errors=\"replace\") if isinstance(exc.stderr, bytes) else (exc.stderr or \"\")
        out, cut_out = deterministic_tail(partial_out)
        err, cut_err = deterministic_tail(partial_err)
        record.update(
            stdout_tail=out, stderr_tail=err, exit_code=None,
            duration_ms=int((time.time() - started) * 1000),
            error=f\"timeout after {timeout_s}s\",
            truncations={\"stdout\": cut_out, \"stderr\": cut_err},
        )
    except FileNotFoundError as exc:
        record.update(stdout_tail=\"\", stderr_tail=\"\", exit_code=None,
                      duration_ms=int((time.time() - started) * 1000), error=str(exc))
    with RECORD.open(\"a\") as fh:
        fh.write(json.dumps(record) + \"\\n\")
    return record


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(\"command\", nargs=\"+\")
    ap.add_argument(\"--note\", default=\"\")
    ap.add_argument(\"--timeout\", type=float, default=30.0)
    args = ap.parse_args()
    rec = run_with_feedback(args.command, agent_note=args.note, timeout_s=args.timeout)
    print(json.dumps(rec, indent=2))
    return 0 if rec.get(\"exit_code\") == 0 else 1


if __name__ == \"__main__\":
    raise SystemExit(main())
"""


VERIFY_AGENT_PY = """#!/usr/bin/env python3
\"\"\"确定性验证门禁，参见阶段 14 第 38 课。

根据已记录的验收命令、范围报告和规则结果生成判定。机器诊断保持英文：
acceptance.missing/failed 为验收缺失/失败，feedback.null_exit 为退出码缺失，
scope.forbidden/off_scope 为禁止修改/越界修改，rule.failed 为规则未通过。

重要限制：此打包版不含覆盖率、严格模式或签名例外；缺少文件时读取空对象/列表。
如果验收、反馈、范围与规则记录全部缺失，当前实现可能仍返回 passed=true。
这是保留原行为的教学示例，不是生产环境中默认拒绝缺证据的安全门禁。
\"\"\"

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(ln) for ln in path.read_text().splitlines() if ln.strip()]


def _normalize_command(cmd) -> str:
    if isinstance(cmd, list):
        return \" \".join(str(part) for part in cmd)
    return str(cmd)


def check_acceptance(accept: list[str], feedback: list[dict]) -> list[dict]:
    findings: list[dict] = []
    commands_run = [_normalize_command(r.get(\"command\")) for r in feedback]
    accept_set = set(accept)
    for cmd in accept:
        if cmd not in commands_run:
            findings.append({\"code\": \"acceptance.missing\", \"severity\": \"block\", \"detail\": f\"never ran: {cmd}\"})
    for r in feedback:
        cmd_str = _normalize_command(r.get(\"command\"))
        if r.get(\"exit_code\") is None:
            findings.append({\"code\": \"feedback.null_exit\", \"severity\": \"block\", \"detail\": f\"missing exit for {cmd_str}\"})
        elif r.get(\"exit_code\") != 0 and cmd_str in accept_set:
            findings.append({\"code\": \"acceptance.failed\", \"severity\": \"block\",
                             \"detail\": f\"exit {r.get('exit_code')} on {cmd_str}\"})
    return findings


def check_scope(scope_report: dict) -> list[dict]:
    findings: list[dict] = []
    if scope_report.get(\"forbidden_writes\"):
        findings.append({\"code\": \"scope.forbidden\", \"severity\": \"block\",
                         \"detail\": f\"forbidden writes: {scope_report['forbidden_writes']}\"})
    if scope_report.get(\"off_scope_writes\"):
        findings.append({\"code\": \"scope.off_scope\", \"severity\": \"warn\",
                         \"detail\": f\"off-scope writes: {scope_report['off_scope_writes']}\"})
    return findings


def check_rules(rule_report: list[dict]) -> list[dict]:
    return [{\"code\": \"rule.failed\", \"severity\": \"block\", \"detail\": f\"rule failed: {row.get('slug')}\"}
            for row in rule_report if not row.get(\"passed\")]


def run_checks(task_id: str) -> dict[str, object]:
    accept = list(_load_json(ROOT / f\"outputs/scope/closed/{task_id}.json\", {}).get(\"acceptance_criteria\", []))
    feedback = _load_jsonl(ROOT / \"feedback_record.jsonl\")
    scope_report = _load_json(ROOT / f\"outputs/scope/closed/{task_id}.report.json\", {})
    rule_report = _load_json(ROOT / \"outputs/rule_report.json\", [])
    findings = check_acceptance(accept, feedback) + check_scope(scope_report) + check_rules(rule_report)
    return {\"task_id\": task_id, \"passed\": not any(f[\"severity\"] == \"block\" for f in findings), \"findings\": findings}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(\"task_id\")
    args = ap.parse_args()
    report = run_checks(args.task_id)
    out = ROOT / \"outputs\" / \"verification\" / f\"{args.task_id}.json\"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + \"\\n\")
    print(json.dumps(report, indent=2))
    if not report[\"passed\"]:
        print(\"验证失败\", file=sys.stderr)
        return 1
    return 0


if __name__ == \"__main__\":
    raise SystemExit(main())
"""


GENERATE_HANDOFF_PY = """#!/usr/bin/env python3
\"\"\"会话结束交接包生成器，参见阶段 14 第 40 课。

输出供人阅读的 Markdown 与供程序读取的 JSON；字段、命令、路径和状态值保留英文。
缺失输入会回退为空数据，本例不会独立强制执行会话结束钩子或验证所有回执是否存在。
\"\"\"

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(ln) for ln in path.read_text().splitlines() if ln.strip()]


def derive_risks(verdict: dict, state: dict, review: dict) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    for f in verdict.get(\"findings\", []) or []:
        if isinstance(f, dict) and f.get(\"severity\") in (\"warn\", \"block\"):
            risks.append({\"severity\": str(f.get(\"severity\")), \"detail\": str(f.get(\"detail\"))})
    for blocker in state.get(\"blockers\") or []:
        risks.append({\"severity\": \"warn\", \"detail\": f\"尚未解决的阻塞项：{blocker}\"})
    try:
        total = int(review.get(\"total\", 10))
    except (TypeError, ValueError):
        total = 10
    if total < 7:
        risks.append({\"severity\": \"warn\", \"detail\": f\"审查总分 {review.get('total')} 低于 7 分\"})
    return risks


def generate_handoff(task_id: str, session_id: str | None = None) -> dict[str, object]:
    state = _load_json(ROOT / \"agent_state.json\", {})
    verdict = _load_json(ROOT / \"outputs\" / \"verification\" / f\"{task_id}.json\", {})
    review = _load_json(ROOT / \"outputs\" / \"review\" / f\"{task_id}.json\", {})
    feedback = _load_jsonl(ROOT / \"feedback_record.jsonl\")
    diff = _load_json(ROOT / \"outputs\" / \"diff_summary.json\", {})

    payload = {
        \"session_id\": session_id or str(int(time.time())),
        \"timestamp\": time.time(),
        \"task_id\": task_id,
        \"summary\": f\"任务 {task_id}：验证门禁={verdict.get('passed')} 审查={review.get('verdict')}\",
        \"changed_files\": diff.get(\"touched\", []),
        \"commands_run\": [str(r.get(\"command\")) for r in feedback],
        \"failed_attempts\": [
            f\"{r.get('command')} -> 退出码 {r.get('exit_code')}\"
            for r in feedback if r.get(\"exit_code\") not in (0, None)
        ],
        \"open_risks\": derive_risks(verdict, state, review),
        \"next_action\": str(state.get(\"next_action\") or \"未记录下一步动作，需要人工确认\"),
        \"verdict_pointer\": {
            \"verdict\": f\"outputs/verification/{task_id}.json\",
            \"review\": f\"outputs/review/{task_id}.json\",
        },
    }
    out = ROOT / \"outputs\" / \"handoff\" / payload[\"session_id\"]
    out.mkdir(parents=True, exist_ok=True)
    (out / \"handoff.json\").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + \"\\n\")
    (out / \"handoff.md\").write_text(_render_markdown(payload))
    return payload


def _render_markdown(p: dict[str, object]) -> str:
    def bullets(items):
        return [f\"- {x}\" for x in items] or [\"- 无\"]
    lines = [
        f\"# 交接记录：{p['task_id']}\",
        \"\",
        f\"**摘要。** {p['summary']}\",
        \"\",
        \"## 变更文件\",
        *bullets(p[\"changed_files\"]),
        \"\",
        \"## 已运行命令\",
        *bullets(p[\"commands_run\"]),
        \"\",
        \"## 失败尝试\",
        *bullets(p[\"failed_attempts\"]),
        \"\",
        \"## 未解决风险\",
        *bullets([f\"[{r['severity']}] {r['detail']}\" for r in p[\"open_risks\"]]),
        \"\",
        \"## 下一步动作\",
        str(p[\"next_action\"]),
        \"\",
        \"## 验证与审查回执\",
        f\"- 验证判定：`{p['verdict_pointer']['verdict']}`\",
        f\"- 审查结果：`{p['verdict_pointer']['review']}`\",
    ]
    return \"\\n\".join(lines) + \"\\n\"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(\"task_id\")
    ap.add_argument(\"--session-id\", default=None)
    args = ap.parse_args()
    try:
        payload = generate_handoff(args.task_id, args.session_id)
    except Exception as exc:
        print(f\"交接生成失败：{exc}\", file=sys.stderr)
        return 1
    print(f\"已写入 outputs/handoff/{payload['session_id']}/{{handoff.json,handoff.md}}\")
    return 0


if __name__ == \"__main__\":
    raise SystemExit(main())
"""


SCRIPT_FILES: dict[str, str] = {
    "init_agent.py": INIT_AGENT_PY,
    "run_with_feedback.py": RUN_WITH_FEEDBACK_PY,
    "verify_agent.py": VERIFY_AGENT_PY,
    "generate_handoff.py": GENERATE_HANDOFF_PY,
}


PACK_README = """# 智能体工作台包（Agent Workbench Pack）

供任何希望智能体可靠工作的仓库使用的即插即用工作台。

## 包含内容（What you get）

- `AGENTS.md`：通向包内其余内容的简短路由入口。
- `docs/`：规则、可靠性政策、交接协议、审查评分标准。
- `schemas/`：状态、看板和范围契约的 JSON 结构定义（JSON Schema）。
- `scripts/`：初始化、反馈运行器、验证关卡、交接生成器。
- `bin/install.sh`：幂等安装器。

## 快速开始（Quickstart）

```
bin/install.sh
$EDITOR task_board.json
python3 scripts/init_agent.py
```

## 版本管理（Versioning）

`VERSION` 文件就是契约。主版本升级需要状态迁移。

## 教学实现边界

此包是结构练习，不是已完成安全验收的生产工作台。安装器仅以 AGENTS.md 的存在作为
覆盖保护条件；复制 docs、schemas、scripts 时仍可能覆盖同名文件。请先在临时仓库
或完整备份中试用，不要直接运行于含未提交改动的工作区。--force 会允许覆盖 AGENTS.md。
安装器不会生成 agent_state.json 或 task_board.json，须另行准备。

打包的验证器在输入文件缺失时使用空对象/列表，可能在证据缺失时仍报告 passed=true；
它没有第 38 课的覆盖率、严格模式和签名例外。反馈脚本也没有第 37 课的脱敏、轮转及命令链。
文档中的完整可靠性与交接政策是设计目标，不代表这些简化脚本已经全部强制执行。
"""


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def main() -> None:
    write(PACK / "AGENTS.md", AGENTS_MD.format(version=PACK_VERSION))
    write(PACK / "docs" / "agent-rules.md", AGENT_RULES_MD)
    write(PACK / "docs" / "reliability-policy.md", RELIABILITY_POLICY_MD)
    write(PACK / "docs" / "handoff-protocol.md", HANDOFF_PROTOCOL_MD)
    write(PACK / "docs" / "reviewer-rubric.md", REVIEWER_RUBRIC_MD)
    write(PACK / "schemas" / "agent_state.schema.json", json.dumps(STATE_SCHEMA, indent=2) + "\n")
    write(PACK / "schemas" / "task_board.schema.json", json.dumps(BOARD_SCHEMA, indent=2) + "\n")
    write(PACK / "schemas" / "scope_contract.schema.json", json.dumps(SCOPE_SCHEMA, indent=2) + "\n")
    for name, body in SCRIPT_FILES.items():
        write(PACK / "scripts" / name, body)
        (PACK / "scripts" / name).chmod(0o755)
    write(PACK / "bin" / "install.sh", INSTALL_SH)
    (PACK / "bin" / "install.sh").chmod(0o755)
    write(PACK / "VERSION", PACK_VERSION + "\n")
    write(PACK / "README.md", PACK_README)

    for path in sorted(PACK.rglob("*")):
        if path.is_file():
            print(path.relative_to(PACK.parent.parent))


if __name__ == "__main__":
    main()
