# Git 更新日志生成器（Changelog Writer From Git）

读取真实 Git 版本范围，保留迁移说明尾注和回退引用，再导出可复现的 Markdown 与来源记录。

难度为第 2 级，共四个阶段，约八小时。使用 Go 实现，仅依赖标准库。 中文分支保留 Breaking changes、Features、Fixes、Other 这些分组契约名称，其他帮助和审阅说明已译。当前环境缺少 Go，原版与译版的 Go 阶段测试尚未实跑；翻译日期不代表运行验证日期。

## 开始之前（Before you start）

使用 Go 1.22 或更新版本，并为评分器准备 Python 3.12 或更新版本。需要熟悉函数、结构体、切片、映射和返回的错误。尚不熟悉这些内容时，先完成[环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)和[数据管理课程](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 阶段（Stages）

1. [读取固定的 Git 导出](stages/01-read-an-immutable-git-export/docs/en.md)
2. [分类约定式提交主题](stages/02-classify-conventional-subjects/docs/en.md)
3. [按稳定顺序分组提交](stages/03-group-commits-with-stable-ordering/docs/en.md)
4. [生成有上限的发布说明](stages/04-render-bounded-release-notes/docs/en.md)

## 动手构建（Build it）

```bash
python3 scripts/project_test.py changelog-writer-from-git --init /tmp/changelog-writer-from-git-work
python3 scripts/project_test.py changelog-writer-from-git --stage 1 --path /tmp/changelog-writer-from-git-work
python3 scripts/project_test.py changelog-writer-from-git --all --solution --strict
```

## 运行交付物（Run the artifact）

```bash
cd projects/changelog-writer-from-git/solution
go run .
```

`--repo PATH --from REV --to REV` 读取固定的 Git 提交范围。也可以使用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 即可保存可复用的交付物。不传参数时，运行包含两个提交的原创测试样本。当前支持使用 SHA-1 提交 ID 的仓库；SHA-256 仓库需要扩展哈希格式支持。

学习者的起始代码已提供命令行入口和集成适配器。你需要实现四个阶段函数；适配器组合调用这些函数，无法绕过尚未完成的实现。完成核心阶段后，阅读 integration.go，查看文件处理边界、来源记录和渲染方式。

演示使用离线样本调用真实参考实现，并在完成后退出。每个阶段至少有五项不同测试，覆盖边界和应拒绝的输入。预期行为由阶段测试定义，实现不会读取留出的测试文件。评分器初始化时保留你的代码，运行时缺失时会如实报告未完成验证。

## 完成证据（Completion evidence）

```bash
python3 scripts/project_test.py changelog-writer-from-git --all --path /tmp/changelog-writer-from-git-work --strict --report /tmp/changelog-writer-from-git-result.json
```

只有完整的学习者报告才能作为本地完成证据。运行参考实现不授予证书。报告属于未经签名的本地记录，本项目不认证生产可用性。

## 来源（Sources）

[官方参考](https://git-scm.com/docs/pretty-formats)。实现和练习均为原创。样本中的数字仅用于演示，不表示外部基准成绩或真实服务保证。
