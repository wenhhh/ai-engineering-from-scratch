# 公开实现契约

使用 --diff - 从标准输入读取；使用 --repo /path --base REF --head REF 只读获取 Git diff；或使用 --candidates recorded-findings.json，将其他评审者的问题记录与所提供的补丁对照校验。

四个词法检测器只能提出范围有限的评审候选问题，不能判定漏洞是否可利用。不支持二进制补丁和合并提交的 combined diff。带引号的 Git 路径先解码，再校验目录穿越和定位信息。不会向远程 PR 发布评论。

### diff_parser.py

```python
def decode_path(raw)
def parse(raw)
```

### main.ts

```typescript
export function parseDiff(raw: string): AddedLine[]
export function inspect(lines: AddedLine[]): Finding[]
export function verify(findings: unknown[], lines: AddedLine[]): { accepted: Finding[]; rejected: unknown[] }
export function merge(findings: Finding[]): Finding[]
export function escapeHTML(value: string): string
export function render(findings: Finding[], rejected = 0): string
```

起始代码已提供记录与类的接口。方法在完成实现之前会故意抛出异常。

候选输入必须为数组。格式损坏的条目应原样保存在 `rejected` 中：读取源码证据前，先拒绝 null、数组、非对象值，拒绝非字符串的 `file`、`quote`、`rule` 或 `message`，以及非正整数行号。quote、rule 和 message 去除两端空白后必须非空；严重程度必须受支持，并满足既有的精确位置和引文匹配规则。只有被接受的问题才能进入渲染或 SARIF 导出。

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
