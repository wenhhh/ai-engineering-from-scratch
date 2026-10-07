# 源码与模型提示、错误和状态保持原契约；只添加中文说明，不连接真实账户。
import html
import json
from pathlib import Path
from intake import ticket
from routing import authorize, TOOLS
from handoff import begin, transition

KNOWLEDGE = {
    "billing": (
        "billing-receipts",
        "Find the invoice reference on the receipt. Include that reference when asking the billing team to review a charge.",
    ),
    "access": (
        "access-recovery",
        "Use the account recovery page to request a reset link. Support never needs your password or API key.",
    ),
    "platform": (
        "platform-status",
        "Check the service status page and record the failing request time and error code before opening an incident.",
    ),
}


def prepare_support(raw, requested_tool=None):
    clean = ticket(raw)
    session = transition(begin(clean), "classify", clean["text"])
    if session["route"] == "human":
        return {
            "ticket": clean,
            "session": transition(
                session, "escalate", "Ambiguous or unsupported topic"
            ),
            "tool": None,
            "evidence": None,
        }
    tool = requested_tool or sorted(TOOLS[session["route"]])[0]
    if not authorize(session["route"], tool):
        raise PermissionError("Selected specialist cannot use that tool")
    source_id, text = KNOWLEDGE[session["route"]]
    return {
        "ticket": clean,
        "session": session,
        "tool": tool,
        "evidence": {"source_id": source_id, "text": text},
    }


def support_ticket(raw, requested_tool=None):
    prepared = prepare_support(raw, requested_tool)
    if prepared["session"]["state"] == "escalated":
        return {**prepared, "method": "offline routing and authored support guidance"}
    session = transition(prepared["session"], "respond", prepared["evidence"]["text"])
    return {
        **prepared,
        "session": session,
        "method": "offline routing and authored support guidance",
    }


def export_support(result, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "support.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    session = result["session"]
    response = (
        session.get("response")
        or "生成回复草稿前，必须由人工审阅该工单。"
    )
    evidence = result.get("evidence") or {}
    page = (
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>支持工单审阅</title><style>body{font:18px system-ui;max-width:800px;margin:3rem auto;padding:0 1rem}pre{white-space:pre-wrap}blockquote{border-left:3px solid #368;padding:1rem}</style><h1>支持工单审阅</h1><p>状态：'
        + html.escape(session["state"])
        + " | 路由："
        + html.escape(session["route"])
        + "</p><h2>脱敏工单</h2><pre>"
        + html.escape(result["ticket"]["text"])
        + "</pre><h2>回复草稿</h2><blockquote>"
        + html.escape(response)
        + "</blockquote><p>来源："
        + html.escape(evidence.get("source_id", "人工审阅"))
        + "</p><p>发送前必须审阅。没有发送邮件或更改账户。</p></html>"
    )
    (out / "index.html").write_text(page, encoding="utf-8")
    return result
