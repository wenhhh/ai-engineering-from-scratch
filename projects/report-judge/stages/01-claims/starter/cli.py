"""审计研究报告 JSON 载荷，并发布可检查的论断证据。"""

import argparse, html, json
from pathlib import Path
from metrics import score_report


def audit_payload(payload):
    if payload.get("schema_version") != 1:
        raise ValueError("report schema_version1 required")
    snippets = payload.get("snippets", {})
    documents = {d["id"]: d for d in payload.get("documents", [])}
    for key, s in snippets.items():
        doc = documents.get(s["doc_id"])
        if (
            doc is None
            or not all(
                isinstance(s[field], int) and not isinstance(s[field], bool)
                for field in ("start", "end")
            )
            or not 0 <= s["start"] <= s["end"] <= len(doc["text"])
            or doc["text"][s["start"] : s["end"]] != s["text"]
        ):
            raise ValueError("changed or missing source span: " + key)
    text = "\n".join(
        sentence["text"].rstrip(".!?")
        + " "
        + "".join("[" + c + "]" for c in sentence["cites"])
        + "."
        for section in payload["sections"]
        for sentence in section["sentences"]
    )
    return with_evidence(
        score_report(text, {key: s["text"] for key, s in snippets.items()}),
        {key: s["text"] for key, s in snippets.items()},
    )


def with_evidence(result, evidence):
    return {
        "schema_version": 1,
        **result,
        "verdicts": [
            {
                **v,
                "evidence": [
                    {"id": key, "text": evidence.get(key, "Missing source")}
                    for key in v["cites"]
                ],
            }
            for v in result["verdicts"]
        ],
    }


def render(result):
    rows = "".join(
        '<tr data-supported="'
        + str(v["supported"]).lower()
        + '"><td>'
        + html.escape(v["claim"])
        + "</td><td>"
        + "".join(
            "<details><summary>"
            + html.escape(e["id"])
            + "</summary><blockquote>"
            + html.escape(e["text"])
            + "</blockquote></details>"
            for e in v.get("evidence", [])
        )
        + "</td><td>"
        + html.escape(v["reason"])
        + "</td></tr>"
        for v in result["verdicts"]
    )
    return (
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>证据审计</title>'
        "<style>body{max-width:1000px;margin:32px auto;padding:16px;font:17px/1.6 system-ui;color:#202020;background:#fafaf5}table{width:100%;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #aaa;text-align:left;vertical-align:top;overflow-wrap:anywhere}blockquote{margin:8px 0}details{max-width:400px}label{display:block;margin:20px 0}@media(prefers-color-scheme:dark){body{background:#191919;color:#eee}}</style>"
        "<h1>证据审计</h1><p>词汇检查识别需审阅的候选，不能证明真实性。</p><p>状态："
        + html.escape(result["state"])
        + "。论断数："
        + str(result["claims"])
        + "。缺失的标注："
        + html.escape(", ".join(result["unavailable"]))
        + "</p>"
        '<label><input id="review" type="checkbox"> 仅显示需要审阅的论断</label><table><tr><th>论断</th><th>展开引用证据</th><th>检查结果</th></tr>'
        + rows
        + "</table>"
        '<script>document.getElementById("review").addEventListener("change",function(){document.querySelectorAll("tr[data-supported]").forEach(row=>{row.hidden=this.checked&&row.dataset.supported==="true"})});</script></html>'
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("input")
    p.add_argument("--research-payload", action="store_true")
    p.add_argument("--out")
    p.add_argument("--html")
    a = p.parse_args()
    data = json.loads(Path(a.input).read_text())
    result = (
        audit_payload(data)
        if a.research_payload
        else with_evidence(
            score_report(
                data["text"],
                data["evidence"],
                data.get("expected_sources", []),
                data.get("facts", []),
            ),
            data["evidence"],
        )
    )
    text = json.dumps(result, indent=2)
    if a.out:
        Path(a.out).write_text(text + "\n")
    if a.html:
        Path(a.html).write_text(render(result))
    print(text)


if __name__ == "__main__":
    main()
