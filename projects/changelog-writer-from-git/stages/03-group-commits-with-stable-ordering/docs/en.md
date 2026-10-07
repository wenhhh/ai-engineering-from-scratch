# 按稳定顺序分组提交（Group commits with stable ordering）

> feat! 进入 Breaking changes 分组，优先于 Features 分组。

**Type:** Build
**Languages:** Go
**Stage:** 3 of 4
**Time:** ~2 小时

## 让发布分组可复现（Make release groups reproducible）

分组按优先级决策。破坏性变更优先于功能或修复。对每个分组内部排序，可使输出不受记录到达程序顺序的影响。源提交继续保存在独立 JSON 来源记录中。

## 推演一个案例（Work through one case）

输入两个修复提交，哈希依次为 bbbbbbb 和 aaaaaaa，分组后变为 aaaaaaa、bbbbbbb。再添加哈希 ccccccc、主题为 `feat!: new wire format` 的提交，它只属于 Breaking changes。直接排序原输入切片会影响其他调用方，因此应把记录分类到新的分组切片中。

```figure
pj-changelog-writer-from-git-3
```

## 实现任务（Your task）

```go
func Group(commits []Commit)(map[string][]Commit,error)
```

在自己的工作区实现这些公开签名。区分输入无效、超出额度和状态冲突。操作失败时，保留原始证据或输入记录。测试直接加载你的工作区，因此只在仓库参考解答中实现另一个函数，不会使你的阶段进度前进。

## 运行测试（Run the tests）

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 3 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Features、BreakingFirst、Stable、Unknown、Empty，覆盖功能分组、破坏性变更优先、稳定排序、未知类型和空输入。根据失败案例定位被破坏的不变条件；仅通过正常示例，无法证明边界行为正确。

## 实现提示（Implementation hints）

创建分组映射，逐条分类，再按哈希对每个结果切片排序。不要直接遍历映射输出章节，因为映射迭代不能保证稳定的展示顺序。

先处理一条合法记录，再补上拒绝案例，最后考虑优化。失败时保持源数据不变，便于调用方诊断。用足够小的函数表达边界，避免额外框架掩盖正在学习的机制。

## 检查理解（Check your understanding）

多次打乱同一提交列表，比较渲染结果的字节。回退提交及其目标都应保持可见；解释为什么静默消去这两个提交，可能掩盖后来的跟进修改。

运行测试前先写下预测。结果不符合预期时，沿校验、状态构造和输出逐步追踪输入。通过测试的参考实现用于比较；你的工作区仍需通过累计评分，才能建立完成证据。

## 使用自己的数据（Use it with your own data）

`--repo PATH --from REV --to REV` 读取固定的 Git 提交范围。也可以使用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 即可保存可复用的交付物。不传参数时，运行包含两个提交的原创测试样本。当前支持使用 SHA-1 提交 ID 的仓库；SHA-256 仓库需要扩展哈希格式支持。

## 来源（Sources）

[Git 格式化输出](https://git-scm.com/docs/pretty-formats)。
