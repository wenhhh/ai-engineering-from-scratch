# 比较精确文本并保留重复次数

> 构建稳定快照，统计新增及移除的文本次数。

**Type:** Build  
**Language:** Go  
**Stage:** 第 2 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

集合会丢失重复文本。按规范化文本块计数，使重复通知少出现一次仍被记录为变化。本项目有意忽略块顺序：把未修改通知移到另一节，不算文本编辑。排序输出行，保持报告稳定。

```figure
pj-web-change-brief-2
```

## 示例推演

before 包含 A、A、B，after 包含 A、B、C。报告移除一次 A，新增一次 C，保留两个未变块。仅改变 A 和 B 的顺序，既不改变报告，也不改变内容哈希。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `CanonicalURL(raw string) (string, error)`
- `NewSnapshot(rawURL, input string, ignores []string) (Snapshot, error)`
- `Compare(before, after Snapshot) (Brief, error)`

规范化 HTTP(S) URL：拒绝凭据、将主机转为小写、去掉片段，为空路径补上 /，保留查询字符串。只比较规范化 URL 完全相同的快照。将排序后的块序列化为 JSON，再计算 SHA-256。新增和移除项包含 text 与 count，unchanged 统计保留的出现次数。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

为两份块列表分别构建计数映射，取较小值作为未变次数，以正差值计算新增和移除。JSON 序列化可避免“单块含分隔符”与“多个块”之间的歧义。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 2 --path my-web-change-brief
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

为什么内容哈希不能证明网页由谁、何时发布？忽略顺序时，哪些变化会被有意忽略？

## 接入最终交付物

独立变化报告、changes.json，以及可复用的 baseline.json 快照。 提取器是有意限制能力的可读文本块扫描器，不是 HTML5 DOM 或浏览器。它不执行 JavaScript、不判断 CSS 可见性，也不获取链接资源。比较时忽略块顺序，但保留重复文本次数。过滤短语可能隐藏有用变化，因此两个快照须使用同一套明确的过滤策略。

完成项目后，尝试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

使用序列算法另加顺序变化报告。将文本新增单独保留，避免把移动段落误报为先删除再新增。

## 权威参考资料

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
