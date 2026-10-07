# 比较页面前先提取文本

> 将 HTML 扫描为规范化的可读文本块，排除已知噪声区域。

**Type:** Build  
**Language:** Go  
**Stage:** 第 1 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

原始 HTML 差异常被时间戳、导航和标记占据。先提取可读文本块序列。本项目扫描标签边界时识别带引号的属性，丢弃注释，忽略 head、script、style、nav、footer 和 noscript 区域。段落、标题、列表项及结构容器构成块边界。

```figure
pj-web-change-brief-1
```

## 示例推演

对于 <nav>Visits 12</nav><p>Bring a mug &amp; a spoon.</p>，只返回 Bring a mug & a spoon. 这一个块。访问计数变化不应影响结果。段落内部的行内 strong 标签应保留相邻文本，不另建一个块。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `ExtractBlocks(input string, ignorePhrases []string) ([]string, error)`

规范化实体和空白，忽略空块。可选的非空过滤短语按不区分大小写匹配，移除整个匹配块。拒绝超过 2,000,000 字节的输入、未闭合标签／注释／忽略区域，以及超过 10,000 个块的输入。明确扫描器支持的子集：它不是完整浏览器解析器，不能推断视觉可见性。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

寻找标签闭合尖括号时，跟踪引号是否打开。只有到达块边界才输出累计文本。追加文本前先跳过忽略区域。空标签必须产生错误或安全地不执行操作，绝不能引发索引 panic。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 1 --path my-web-change-brief
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

页面作者可能在页脚放入哪些有用文本？为什么删除整个短语命中块需要明确策略？

## 接入最终交付物

独立变化报告、changes.json，以及可复用的 baseline.json 快照。 提取器是有意限制能力的可读文本块扫描器，不是 HTML5 DOM 或浏览器。它不执行 JavaScript、不判断 CSS 可见性，也不获取链接资源。比较时忽略块顺序，但保留重复文本次数。过滤短语可能隐藏有用变化，因此两个快照须使用同一套明确的过滤策略。

完成项目后，尝试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

为要监测的真实 HTML 增加有文档说明的站点提取规则及夹具。解析失败必须可见，不能返回看似成功的空快照。

## 权威参考资料

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
