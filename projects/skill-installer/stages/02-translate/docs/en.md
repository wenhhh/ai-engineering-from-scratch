# 转换元数据并计算内容哈希

**第 2 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

保留同一份指令正文，同时重新生成简短且带引号的元数据头。参考文件逐字节保留。对排序后的路径／内容对计算 SHA-256 摘要，避免文件插入顺序影响完整性。摘要能够检测内容变化，却不能证明发布者身份；调用方负责取得可信的预期摘要。

本阶段的接口边界为 `digest, translate`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-installer-2
```

译注：图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 1 阶段](../../01-bundle/docs/en.md)。

将 name 和 description 序列化为与 JSON 兼容的双引号 YAML 标量。Rust 校验器接受相同子集，包括转义字符。由于转换会重写元数据，来源摘要与转换后摘要不同。

```text
source bundle digest -> expected source identity
translated SKILL.md: name: "orchard-release"
translated digest -> installed content identity
```

## 构建与检查

计算哈希前先排序文件条目。摘要只能将内容与可信预期进行比较；从不可信字节直接计算摘要，不能证明发布者身份。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-installer --stage 2 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

描述中含有引号时，安装器与校验器之间的往返应如何保留它？

译注：这里的 translate 表示转换技能元数据格式，不是自然语言翻译。来源摘要只覆盖 files 的排序映射，不绑定顶层 name 和 description；顶层元数据必须另行从可信渠道核实。模板正文、参考材料、异常和 JSON 字段保留原值。更新采用先移走旧目录、再移入新目录的两次重命名，不能将其理解为对并发读取者无间隙的替换或断电事务。
