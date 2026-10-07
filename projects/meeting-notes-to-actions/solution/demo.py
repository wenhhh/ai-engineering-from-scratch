# 使用原创会议文本演示提取；输入语法与输出状态保留原值，不创建外部任务。
import json
from main import *
from pathlib import Path

notes = "Decision: ship after review.\nACTION Alex | 2026-09-30 | Publish the release notes\nACTION ? | ? | Verify the migration plan\nACTION Alex | 2026-09-30 | Publish the release notes"
report = publish(parse_notes(notes), "2026-09-28")
Path("actions.html").write_text(report.pop("html"))
print(json.dumps(report, indent=2))
