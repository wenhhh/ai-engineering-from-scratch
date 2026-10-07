# 拒绝含糊或不支持的契约

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

增加数值上下界、枚举成员、Unicode 字符串最小长度、数组长度边界和禁止额外属性的对象校验。转义属性路径中的斜杠与波浪号。出现教学子集以外的关键字时，报告配置错误，不能静默视为成功。本实现不宣称完全符合 JSON Schema：引用、格式及组合关键字仍需额外实现。

本阶段的接口边界为 `validate, guard`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

必填键 a/b~c 的问题路径应为 $/a~1b~0c。先转义 ~，再转义 /；顺序颠倒或省略转义，会使诊断指向错误字段。字符串最小长度按 Unicode 码点计数。

```figure
pj-json-schema-output-guard-3
```

译注：图表限制：此共享计算器仅演示固定对象的简化校验，未执行完整递归、字节上限或实际修复循环，且先解析数据再检查可选关键字。完整 TypeScript 实现在读取模型输出前预检结构定义；实现行为以源码测试为准。

改变实验输入，在阅读指标前先自行计算结果。图表根据这些输入进行计算；实现完成与否仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `validate, guard`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

将不支持的词汇作为配置异常，将普通值不匹配作为 Issue[] 返回。检查模型数据前，先校验全部结构定义形态，包括 minItems 和嵌套 properties。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py json-schema-output-guard --stage 3 --path learning-artifacts/json-schema-output-guard --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 探究失败边界

使用一个空数组，但让 items 中包含 $ref。空输入不能绕过结构定义词汇校验。




## 参考资料

[JSON Schema 校验词汇表](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行说明](https://nodejs.org/api/typescript.html)
