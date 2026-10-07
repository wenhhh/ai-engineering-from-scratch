# 递归遍历结构定义

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

实现对象、数组及基本值校验。使用自有属性语义检查必填属性；继承的属性不满足契约。将 integer 视为 number 的更严格子类型，拒绝非有限数值，并为每次失败保留路径。将递归下降深度限制为 32，防止结构定义和值无限消耗调用栈。

本阶段的接口边界为 `validate`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

当结构定义为 properties.results.items.type=integer 时，值 {results:[1,"2"]} 会在 $/results/1 产生问题。即便文本 "2" 可以强制转换为数字，也不能因此自动转换。

```figure
pj-json-schema-output-guard-2
```

译注：图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。

改变实验输入，在阅读指标前先自行计算结果。图表根据这些输入进行计算；实现完成与否仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `validate`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

在递归过程中向下传递属性路径，不要等失败后重新构造。对必填字段检查自有属性；即使可选值未出现，也要拒绝无效的结构定义子树。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 2 --path learning-artifacts/json-schema-output-guard --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探究失败边界

在 properties.unused 下加入不支持的关键字，再校验 {}。结构定义预检必须先拒绝该配置，不能宣称空对象有效。




## 参考资料

[JSON Schema 校验词汇表](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行说明](https://nodejs.org/api/typescript.html)
