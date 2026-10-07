import tempfile
from pathlib import Path
from main import parse_message, export_desk

with tempfile.TemporaryDirectory() as directory:
    inputs = Path(__file__).parent / "fixtures"
    report = export_desk(
        [parse_message(p.read_bytes()) for p in sorted(inputs.glob("*.eml"))],
        Path(directory),
    )
    print("三封原创示例邮件组成审阅队列：")
    for row in report["entries"]:
        print(row["decision"]["category"].ljust(12), row["message"]["subject"])
        print(
            "  证据：",
            ", ".join(e["quote"] for e in row["decision"]["evidence"])
            or "没有匹配的短语；请人工检查",
        )
    print(
        "线程数：",
        len(report["threads"]),
        "| 未发送草稿数：",
        len(report["entries"]),
        "| 已发送邮件数：0",
    )
    print(
        "运行 python3 main.py --input ./fixtures --out ./inbox-output，保存 HTML、JSON 和草稿。"
    )
