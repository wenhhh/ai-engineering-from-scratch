# 生成有上限的发布说明（Render bounded release notes）

> 提交中的 `[x](bad)` -> 发布说明中经过转义的普通文本

**Type:** Build
**Languages:** Go
**Stage:** 4 of 4
**Time:** ~2 小时

## 从真实仓库生成发布交付物（Build a release artifact from an actual repository）

命令行接收仓库路径和两个版本，将版本名解析为固定提交 ID，再读取不含起点、包含终点的范围，生成 Markdown 和可选 JSON 来源记录。它不会更改检出状态，也不会发布版本。

## 推演一个案例（Work through one case）

运行 `go run . --repo /path/to/repo --from v1.0 --to HEAD --label v1.1 --output release.md --receipt release.json`，检查来源记录哈希和迁移章节。尾注记录作者声明需要修改的内容，但无法证明这些指引完整无缺。

```figure
pj-changelog-writer-from-git-4
```

## 实现任务（Your task）

```go
func Release(label string,commits []Commit,max int)(string,error)
```

在自己的工作区实现这些公开签名。区分输入无效、超出额度和状态冲突。操作失败时，保留原始证据或输入记录。测试直接加载你的工作区，因此只在仓库参考解答中实现另一个函数，不会使你的阶段进度前进。

## 运行测试（Run the tests）

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 4 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Output、BadLabel、Limit、Escape、SectionOrder，覆盖输出、无效标签、数量上限、转义和章节顺序。根据失败案例定位被破坏的不变条件；仅通过正常示例，无法证明边界行为正确。

## 实现提示（Implementation hints）

渲染前校验发布标签和提交数量上限。将描述转义为 Markdown 普通文本，采用固定章节顺序，并保留每个源提交哈希。适配器使用参数数组、十秒截止时间和有上限的输出缓冲区，不通过 shell 解释提交文字。

先处理一条合法记录，再补上拒绝案例，最后考虑优化。失败时保持源数据不变，便于调用方诊断。用足够小的函数表达边界，避免额外框架掩盖正在学习的机制。

## 检查理解（Check your understanding）

从小型临时仓库生成发布说明，比较前后的 git status。在新分支修改一个源提交，证明导出指纹随之变化。手动发布前，检查显式回退引用。

运行测试前先写下预测。结果不符合预期时，沿校验、状态构造和输出逐步追踪输入。通过测试的参考实现用于比较；你的工作区仍需通过累计评分，才能建立完成证据。

## 使用自己的数据（Use it with your own data）

`--repo PATH --from REV --to REV` 读取固定的 Git 提交范围。也可以使用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 即可保存可复用的交付物。不传参数时，运行包含两个提交的原创测试样本。当前支持使用 SHA-1 提交 ID 的仓库；SHA-256 仓库需要扩展哈希格式支持。

## 来源（Sources）

[Git 格式化输出](https://git-scm.com/docs/pretty-formats)。
