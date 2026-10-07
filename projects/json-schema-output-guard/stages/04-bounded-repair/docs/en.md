# 在有限预算内修复输出

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

只将结构化校验反馈传给生成回调。解释输出前，先计入本次调用。接受输出后立即停止；最后一次尝试仍被拒绝时，返回明确的 exhausted 状态。服务商故障向上传播，不伪装成结构校验失败。轨迹记录每次尝试，避免第三次成功掩盖之前两次契约违规。

本阶段的接口边界为 `repair`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

样本先记录 confidence 为 1.5，再记录为 0.8。第一条响应产生 above-maximum 问题；第二次尝试前，回调会收到该问题。接受输出后立即返回，不再花费第三次调用。

```figure
pj-json-schema-output-guard-4
```

译注：图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。

改变实验输入，在阅读指标前先自行计算结果。图表根据这些输入进行计算；实现完成与否仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `repair`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

调用 generate 之前先执行 checkSchema，避免损坏的结构定义消耗服务商预算。服务商异常应保留为服务商故障，不能转换成无限重试的理由。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 4 --path learning-artifacts/json-schema-output-guard --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探究失败边界

提供两条无效响应，预算设为 2。断言状态为 exhausted，且轨迹恰好包含两行；然后只把第二条响应替换为有效对象，检查被接受的交付物。

本项目只实现明确限定的 JSON Schema 子集，拒绝 $ref、format 和组合关键字。通过结构定义校验并不能证明答案事实正确。回放响应记录进行修复，也不属于在线模型调用。


## 参考资料

[JSON Schema 校验词汇表](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行说明](https://nodejs.org/api/typescript.html)
