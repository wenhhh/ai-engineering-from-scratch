# 教学协议夹具：保留请求 id、旧版协议枚举及机器错误，避免将展示翻译混入通信。
import json
from audit import audit_catalog
from discovery import discover
from registry import catalog

summary = audit_catalog()
print(json.dumps({k: v for k, v in summary.items() if k != "names"}, indent=2))
print(json.dumps(discover(catalog(), "pods count", max_chars=600), indent=2))
