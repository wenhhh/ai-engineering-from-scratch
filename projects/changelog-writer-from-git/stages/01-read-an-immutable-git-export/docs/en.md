# 读取固定的 Git 导出（Read an immutable Git export）

> git log --format=%h%x09%s -> 哈希与提交主题

**Type:** Build
**Languages:** Go
**Stage:** 1 of 4
**Time:** ~2 小时

## 读取记录并保留证据（Read records without losing the evidence）

Git 提交包含哈希、主题和正文。第一个练习刻意从“哈希、制表符、主题”的记录格式开始，让你先理解解析边界，再使用提供的 Git 适配器处理以 NUL 分隔的正文。不能按换行符拆开完整提交正文，再把每行都当作一个新提交。

## 推演一个案例（Work through one case）

`abc1234\tfeat: cache` 与 `abc1234\tfix: cache` 两条记录即使主题不同，也存在哈希冲突。维护已接受哈希的集合，追加第二条记录前先检查其哈希；发现冲突时返回错误，不返回部分结果。

```figure
pj-changelog-writer-from-git-1
```

## 实现任务（Your task）

```go
func ParseLog(text string)([]Commit,error)
```

在自己的工作区实现这些公开签名。区分输入无效、超出额度和状态冲突。操作失败时，保留原始证据或输入记录。测试直接加载你的工作区，因此只在仓库参考解答中实现另一个函数，不会使你的阶段进度前进。

## 运行测试（Run the tests）

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 1 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Valid、Duplicate、BadHash、NoSubject、Empty，分别覆盖正常记录、重复哈希、无效哈希、缺少主题和空输入。根据失败案例定位被破坏的不变条件；仅通过正常示例，无法证明边界行为正确。

## 实现提示（Implementation hints）

使用最多拆为两部分的 SplitN，让第一个分隔符确定边界。检查哈希的每个字符，并拒绝空主题。集成适配器单独保留正文，将导出数据限制为 4 MiB。

先处理一条合法记录，再补上拒绝案例，最后考虑优化。失败时保持源数据不变，便于调用方诊断。用足够小的函数表达边界，避免额外框架掩盖正在学习的机制。

## 检查理解（Check your understanding）

为什么提交正文可以包含换行，而单行主题导出不能这样处理？构造一份被截断的 NUL 分隔导出，解释适配器为何拒绝它。

运行测试前先写下预测。结果不符合预期时，沿校验、状态构造和输出逐步追踪输入。通过测试的参考实现用于比较；你的工作区仍需通过累计评分，才能建立完成证据。

## 使用自己的数据（Use it with your own data）

`--repo PATH --from REV --to REV` 读取固定的 Git 提交范围。也可以使用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 即可保存可复用的交付物。不传参数时，运行包含两个提交的原创测试样本。当前支持使用 SHA-1 提交 ID 的仓库；SHA-256 仓库需要扩展哈希格式支持。

## 来源（Sources）

[Git 格式化输出](https://git-scm.com/docs/pretty-formats)。
