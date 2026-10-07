# 公共实现契约（Public implementation contract）

用实现 observe、act 和 capture 的适配器替换 Driver。先启动教学测试页面的服务并设置 BROWSE_BIN，再运行 cli.ts --live。

离线模式检验测试场景的状态转移和预先记录的像素。绿色像素仅是本测试页面的特定信号，不能代表通用视觉理解。真实运行的 CLI 仅允许访问明确放行的回环地址页面。

### pixels.py

```python
def inspect(data)
```

### main.ts

```typescript
export function parseObservation(raw: unknown): Observation
export function choose(observation: Observation, task: Task): Action
export function inspectPNG(file: string):
export async function runAgent(driver: Driver, task: Task, maxSteps = 5)
export function scoreRuns(statuses: string[])
```

起始代码已提供记录类型和类接口；方法在完成实现之前会明确抛出异常。

PNG 数据缺失或无效时，`inspectPNG` 抛出异常。`runAgent` 捕获截图与检查错误，返回 `status: "screenshot-error"`、`trace`、`reason` 和 `screenshot`；后者为截图返回路径，捕获失败时为 `null`。结果不会捏造 `visual` 指标。CLI 保存运行记录并以状态码 2 退出。

阶段测试规定正常结果与应拒绝的输入。不要把学习者实现的导入替换为参考解答导入。最后一个阶段还会让提供的输入驱动程序调用你的累积实现。
