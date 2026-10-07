# 解析不可信输入边界

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

模型响应以字节字符串形式到达。将整个字符串作为 JSON 解析，拒绝 Markdown 包装和尾随文本，并在解析前限制 UTF-8 字节数。除对象外，也接受 JSON 基本值：基本值是否适用由结构定义决定。不要不断删除文本直到碰巧解析成功，否则会掩盖实际输出契约。

本阶段的接口边界为 `parseJSON`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

字符串 `{"answer":"yes"}` 是有效 JSON。在末尾加上一句说明，就会使整个响应无效。为了成功解析而删掉该说明，会掩盖服务商违反契约的事实。

```figure
pj-json-schema-output-guard-1
```

译注：图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。

改变实验输入，在阅读指标前先自行计算结果。图表根据这些输入进行计算；实现完成与否仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `parseJSON`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

在 JSON.parse 之前统计 UTF-8 字节数。一千个非 ASCII 字符未必只占一千字节。区分 JSON null 与属性不存在的情况。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 1 --path learning-artifacts/json-schema-output-guard --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探究失败边界

分别尝试 Markdown 代码围栏和有效的 JSON 基本值。围栏应在解析时失败；基本值是否适用，则由结构校验阶段判断。




## 参考资料

[JSON Schema 校验词汇表](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行说明](https://nodejs.org/api/typescript.html)
