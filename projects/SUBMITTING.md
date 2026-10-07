# 提交实践项目

构建一个学习者完成课程后仍能使用的交付物。通过四至八个阶段教学，并确保完整参考流程可离线运行，不需要 API 密钥。项目清单、运行器、图表、演示和完成证据的精确契约见[编写规范](AUTHORING.md)。

## 选择实用成果

合适的项目可交付报告生成器、证据索引、技能校验器、记忆服务、工作流工具、协议服务器或评估框架。必须如实限定范围。夹具后端用于讲授桌面协议时，应明确标注，不能称为操作系统集成。

项目必须采用原创实现与课程。技术事实应引用官方文档、规范和研究论文。避免抓取个人数据、绕过安全控制，或只调用托管模型而没有实质工程练习。

## 创建项目

```bash
cp -R projects/_template projects/your-project-id
```

使用与目录名一致、由连字符分隔的小写 ID。将 `source` 设为 `community`，在 `author` 中保留你的姓名和 GitHub 用户名。开发阶段时保持 `status` 为 `draft`。目录保留作者署名，不会自动将草稿提升为可构建状态。

模板包含一个小型 Python 阶段，用于展示契约。将其扩展为四至八个阶段，并用自己的交付物替换示例。Python、TypeScript、Rust 和 Go 使用标准库运行器。混合语言项目应为每个阶段声明实际运行器。包含全新学习者工作区需要的全部模块和夹具。

## 讲授并验证每个阶段

说明实用行为、约束该行为的不变条件、一个示例推演、精确的公开函数签名、错误，以及学习者可复制的命令。每阶段需要五项有意义的测试、一个失败用例、明确失败的起始代码和一个已注册的原创机制图。测试必须加载学习者工作区，不能静默导入版本库中的参考解答。

后续起始材料只增加文件，不覆盖先前工作。除非学习者明确传入 `--force`，初始化器会保留已有文件，包括学习者实现。加入留出测试或数据集、实测评估结果，以及循环和预算的具名终止状态。

## 演示交付物

在 `demo` 下声明会自行结束的 argv 命令，例如 `{"command":["python3","demo.py"],"cwd":"solution"}`。录制真实输出，将 GIF 或视频及其封面提交到项目的 `media/` 目录，在 `demos` 中声明相对路径。网站构建会打包课程和录屏，因此预览不依赖 GitHub main 中尚未发布的文件。

## 验证并投稿

```bash
python3 scripts/project_test.py your-project-id --all --solution --strict
python3 scripts/project_test.py your-project-id --init /tmp/your-project-check
python3 scripts/project_test.py your-project-id --stage 1 --path /tmp/your-project-check
node --test site/test_projects_data.js
node site/build-projects.js --strict
```

参考解答必须通过全部阶段，且没有跳过测试。全新起始代码必须失败，并给出能指导实现的提示。严格检查拒绝缺少运行时、空测试套件、跳过测试、缺失图表和缺失录屏。不提交生成的 `site/projects-data.js` 或 `site/project-content/` 文件。

从功能分支发起拉取请求。维护者会审阅原创课程，测试参考交付物，以学习者身份尝试前几个阶段，并检查网站中的渲染结果。完成证明使用完整的学习者评分报告；参考解答结果和手动勾选均不能证明完成。
