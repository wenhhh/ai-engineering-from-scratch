# 分类约定式提交主题（Classify conventional subjects）

> feat(api)!: remove v1 -> 类型 feat、范围 api、破坏性变更标记 true

**Type:** Build
**Languages:** Go
**Stage:** 2 of 4
**Time:** ~2 小时

## 分类主题时保留迁移风险（Classify a subject without discarding migration risk）

约定式提交主题采用一套小型语法：类型、可选范围、可选感叹号、冒号加空格、描述。真实仓库还会包含合并提交和普通文字。将这些记录保留在 Other 分组，供发布编辑者检查。

## 推演一个案例（Work through one case）

`fix(api)!: rename timeout` 得到 kind fix、scope api、breaking true 和描述 rename timeout。独立尾注 `BREAKING CHANGE: Rename config.` 也会在本函数运行前将 breaking 设为 true。分类器必须保留已有信号，不能因为主题缺少感叹号，就覆盖该标记。

```figure
pj-changelog-writer-from-git-2
```

## 实现任务（Your task）

```go
func Classify(c Commit)(Commit,error)
```

在自己的工作区实现这些公开签名。区分输入无效、超出额度和状态冲突。操作失败时，保留原始证据或输入记录。测试直接加载你的工作区，因此只在仓库参考解答中实现另一个函数，不会使你的阶段进度前进。

## 运行测试（Run the tests）

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 2 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Feature、Scope、Breaking、Other、Blank，覆盖功能提交、范围、破坏性变更、其他主题和空主题。根据失败案例定位被破坏的不变条件；仅通过正常示例，无法证明边界行为正确。

## 实现提示（Implementation hints）

对主题执行一次语法匹配。无法识别但非空的主题应原样保留。将传入的 breaking 标记与主题中的感叹号信号作逻辑或。空主题属于无效输入，不能归入 Other。

先处理一条合法记录，再补上拒绝案例，最后考虑优化。失败时保持源数据不变，便于调用方诊断。用足够小的函数表达边界，避免额外框架掩盖正在学习的机制。

## 检查理解（Check your understanding）

分别让传入的 breaking 标记为 false 和 true，再分类同一主题。哪些字段会变化？为什么直接替换标记会丢失迁移证据？

运行测试前先写下预测。结果不符合预期时，沿校验、状态构造和输出逐步追踪输入。通过测试的参考实现用于比较；你的工作区仍需通过累计评分，才能建立完成证据。

## 使用自己的数据（Use it with your own data）

`--repo PATH --from REV --to REV` 读取固定的 Git 提交范围。也可以使用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 即可保存可复用的交付物。不传参数时，运行包含两个提交的原创测试样本。当前支持使用 SHA-1 提交 ID 的仓库；SHA-256 仓库需要扩展哈希格式支持。

## 来源（Sources）

[Git 格式化输出](https://git-scm.com/docs/pretty-formats)。
