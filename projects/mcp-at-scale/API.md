# 公开实现契约

运行 `python3 cli.py /absolute/inventory.json --serve` 启动 stdio 服务器。tools/call catalog_search 接收 query、max_chars 和 k；响应返回选中的公开结构定义及其字符数量。

stdio 传输实现文档中说明的 2025-06-18 与 2025-11-25 初始化／工具子集，不宣称完全符合当前 MCP。清单读取使用本地响应记录；生成 250 个工具，也不代表接入了 250 个独立系统。

### audit.py

```python
def audit_catalog(inventory=None)
```

### discovery.py

```python
def discover(tools, query, max_chars=1500, k=5)
```

### protocol.py

```python
def handle(request, state, inventory)
def serve(lines, output, inventory, tools=None)
```

### registry.py

```python
def catalog()
def execute(tool, arguments, inventory)
```

### client.ts

```typescript
export function exchange(server: string, requests: Request[], timeout = 3000): Promise<Response[]>
```

起始代码已提供记录与类的接口。方法在完成实现之前会故意抛出异常。

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
