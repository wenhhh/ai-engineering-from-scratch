# 项目编写规范

每个项目通过四至八个递进阶段，教学习者构建一个实用交付物。每个阶段新增一种明确行为，讲解具体示例，并测试学习者的实现。参考解答和演示使用标准库离线运行。策略模拟器必须明确标为模拟器，不得宣称提供操作系统隔离。

## 规划项目

将尚未实现的想法保存在 `projects/roadmap.json` 的 `planned` 下。每个条目都要包含唯一的 `id`、`title`、`level`、`languages`、`source`、`tagline`、`summary`、具体的 `output`、四个拟议的 `milestones`，以及 `prerequisiteProjects` ID。添加 `distinctFrom` 和 `firstDemo`，说明其独立教学重点。入门规划可以没有先修项目。规划中的先修链接必须能解析，且不得形成循环依赖。

保持[规划简介](ROADMAP.md)与元数据一致。使用 `status: "planned"`；不要创建空参考实现，也不要宣称项目已完成。真实项目满足可构建契约后，构建后的目录会用其可构建清单替换规划卡片。

## 文件与元数据

`projects/<id>/project.json` 管理目录元数据。`id` 必须与目录名一致，由连字符分隔的小写词组成。必填字段为 `title`、`tagline`、`summary`、`level`（1 至 5）、`hours`、`languages`、`status`（`draft` 或 `ready`）、`source`（`core` 或 `community`），以及非空的 `stages` 数组。阶段 ID 必须唯一。只有 README、参考实现、各阶段文档、测试和起始文件全部存在，才可接受 `ready` 状态。草稿项目不得显示为可构建项目。

```json
{
  "id": "example-project",
  "title": "Example Project",
  "tagline": "A concrete useful artifact.",
  "summary": "What you build and how you verify it.",
  "level": 2,
  "hours": 8,
  "languages": ["Python", "TypeScript"],
  "status": "draft",
  "source": "community",
  "author": {"name": "Your Name", "github": "your-handle"},
  "demo": {"command": ["python3", "demo.py"], "cwd": "solution"},
  "stages": [
    {
      "id": "01-first-stage",
      "title": "First stage",
      "summary": "One specific new capability.",
      "hours": 2,
      "difficulty": "starter",
      "concepts": ["input validation"],
      "language": "python",
      "timeout": 60
    }
  ]
}
```

每个阶段位于 `stages/<stage-id>/`，包含 `docs/en.md`、`starter/` 和 `tests/`。累计参考实现位于 `solution/`。起始文件路径相对于学习者工作区。初始化会复制所有普通文件，包括 `.rs`、`.ts`、`.go`、夹具和模块文件。除非明确使用 `--force`，否则保留已有文件。避免在后续起始材料中重复提供持续变化的源文件：脚手架应逐步增加，不能覆盖学习者的工作。

## 评分器运行器

每个阶段声明 `language`：`python`、`typescript`、`rust` 或 `go`。混合语言阶段使用 `language: "rust+python"`，并配置 `runners: [{"language":"rust"},{"language":"python"}]`。评分器为每个运行器将 `PROJECT_WORKSPACE`、`PROJECT_ROOT` 和 `PROJECT_STAGE` 设为绝对路径，并将工作区放在 `PYTHONPATH` 最前面。

- Python 使用 `unittest` 发现 `tests/test_*.py`，按正常方式导入学习者的包。
- TypeScript 使用 Node 22.18 或更新版本、`--experimental-strip-types` 和 `node --test`，运行 `tests/*.test.ts` 或 `tests/*.test.mjs`。使用 `pathToFileURL(path.join(process.env.PROJECT_WORKSPACE, 'main.ts'))` 导入学习者文件。只使用可直接擦除类型的 TypeScript 语法。
- Rust 使用 `rustc --edition 2021 --test` 分别编译每个 `tests/*.rs`，然后执行生成的二进制文件。通常在模块内通过 `include!(concat!(env!("PROJECT_WORKSPACE"), "/main.rs"));` 导入学习者代码。不需要 Cargo 依赖。
- Go 将工作区及阶段 `tests/*.go` 复制到临时目录，运行 `go test -json ./...`。模块化工作区应包含 `go.mod`；没有该文件时，运行器使用 `GO111MODULE=off`。阶段测试相对于 `tests/` 的路径保留在临时工作区中。

显式单运行器使用 argv 数组：`"runner": ["node", "--experimental-strip-types", "--test", "{tests}/stage.test.ts"]`。多运行器使用 `"runners": [{"language":"python","argv":["python3","-m","unittest","discover","-s","{tests}"]}]`。支持的替换项为 `{workspace}`、`{project}`、`{stage}` 和 `{tests}`。命令不经过 shell。自定义运行器必须输出所选语言的标准测试摘要；退出码为零但没有执行测试，仍视为失败。

可选的 `requires: ["rustc"]` 列出必需可执行程序。运行器设置继承阶段的 `requires` 和 `timeout`；超时以秒计，必须为正数且不超过 600。缺少工具时产生 `skip`；普通评分可以继续并以零退出，但 `--strict` 会使任何跳过导致命令失败。测试内部的跳过始终阻止生成完成证据。超时和测试失败也会使命令失败。工具检测、测试数量、跳过数量和各运行器状态均写入报告。

## 命令与完成证据

```bash
python3 scripts/project_test.py example-project --init /tmp/example-work
python3 scripts/project_test.py example-project --stage 2 --path /tmp/example-work
python3 scripts/project_test.py example-project --all --solution --strict
python3 scripts/project_test.py --all --solution --strict
python3 scripts/project_test.py example-project --all --path /tmp/example-work --strict --report /tmp/example-result.json
```

`--stage N` 检查第 1 至第 N 阶段；`--only` 只检查所选阶段。不指定项目时，`--all` 检查所有已发布的可构建项目。JSON 报告包含 `schemaVersion: 1`、`generatedAt`、`projects` 和汇总的 `certificateEligible`。每个项目包含 `id`、`title`、`mode`、`manifestHash`、`selectedStages`、`stages`、`allStagesPassed` 和 `certificateEligible`。每个阶段包含 `id`、`number`、`language`、`status`（`pass`、`fail` 或 `skip`）、`tests`、`skippedTests`、`durationMs`、`reason` 和 `runners`。

只有全部声明的阶段均实际执行、每阶段至少一项测试通过且无任何跳过，学习者才符合条件。参考解答运行、缺少运行时、只选择部分阶段或阶段失败，均不能取得完成证明。这是本地自报证据，不是密码学身份认证或防作弊系统。

## 文档、图表与演示

每节课都应解释构建内容、用途、示例推演、精确函数契约、测试命令、失败情况和扩展方向。在 `figure` 围栏中加入已注册的机制图。在 `site/figures/projects/<id>.js` 中使用原创 SVG 图表提供器，调用 `window.AIFSProjectFigures.register('pj-<id>-1', {title, steps: [{label, detail}], caption})`。每张图都应解释该阶段的具体机制和状态转换。应让学习者编辑输入并查看计算得到的中间值；仅让一排方框轮流高亮不足以满足要求。

需要可计算的机制时，在注册配置中添加 `lab`：

```javascript
lab: {
  controls: [
    {key: 'events', label: 'Completed events', type: 'range', value: 3, min: 0, max: 10, step: 1}
  ],
  calculate(values, stepIndex) {
    return {
      summary: values.events + ' receipts remain available for inspection.',
      metrics: [{label: 'Receipts', value: values.events}],
      bars: [{label: 'Completed events', value: values.events, max: 10}]
    };
  }
}
```

控件支持 `range`、`number`、`text`、`select` 和 `checkbox`。下拉选项包含 `value` 与 `label`。计算还可以返回 `columns` 和 `rows`，用于生成证据表。共享运行器校验有限数值输入、转义显示文本、保留焦点，并提供重置。计算应体现具体领域机制，并符合所教契约。已有自定义 SVG 提供器可以调用 `window.AIFSProjectFigures.mountLab(host, lab)`，无需替换原动画。

阶段中可选的 `figure` 标识一个已注册机制。构建器还会从文档提取图表，输出 `figures` 和 `figureScripts`。未知图表 ID 会使可构建项目的构建失败。演示元数据使用 argv 形式的 `command` 和相对于项目的 `cwd`，通常为 `solution`。可选的 `path`、`poster` 或 `video` 字段指向项目内部文件。演示必须自行结束并展示真实输出。路径穿越和通过符号链接越界均被拒绝。

## 发布检查

每个阶段至少编写五项有意义的测试，覆盖普通输入、边界、格式错误输入，以及失败或对抗情况。保留一个独立于演示夹具的留出用例。测试可观察的契约，不要复制参考算法来充当测试。所有宣称支持的语言都必须实际运行实现代码。协议事实应引用当前官方规范和文档；课程讲解与代码必须原创。

提供一条有文档说明的命令，接受学习者自己的输入，并组合所教函数。只有硬编码演示不能证明工具可复用。明确输出模式、集成命令和在线适配器范围。确认导出的交付物能被预期的下一步骤使用，包括从 HTML 界面下载的审批文件或进度文件。

阶段测试只能依赖已经讲授的行为或明确提供的脚手架。起始代码中的函数签名必须精确；解释全部隐含先修要求，并用一个完整输入展示各项中间值。初学者应能定位失败，而不必猜测预期返回结构。

使用 `--all --solution --strict` 运行参考实现，初始化全新工作区，确认其第一阶段明确失败。审阅前运行 `node --test site/test_projects_data.js site/test_project_certificates.js` 和 `node site/build-projects.js --strict`。使用 Chromium 检查实际托管页面，覆盖桌面和移动端宽度、两种主题。确认控件会改变计算结果，录屏与当前命令一致。HTML 输出录屏应展示实际生成的界面及证据交互。不提交生成文件 `site/projects-data.js`。社区投稿保留作者署名，并通过拉取请求审阅。

## 可选框架对照

阶段可以添加可选 SDK 对照，但不能让离线核心依赖框架：

```json
{
  "runners": [
    {"language": "python"},
    {
      "language": "python",
      "optional": true,
      "requires": ["python:google.adk"],
      "argv": ["{python}", "-m", "unittest", "discover", "-s", "{stage}/tests-framework", "-p", "test_framework.py"]
    }
  ]
}
```

`{python}` 使用当前评分器解释器。依赖声明接受可执行程序名、`python:module.name` 和 `node:package-name`。Python 和 Node 探针只解析包位置，不导入依赖。缺少包时产生 `skip` 并给出安装提示。由于导入名与发行包名可能不同，作者应另行记录固定且受支持的依赖版本。

使用 `--optional` 纳入这些运行器。`--optional --strict` 会在依赖缺失时失败。默认完成证据只覆盖必需的离线核心，不证明熟练掌握框架。明确选择可选运行器后，其中的失败或跳过同样阻止完成。可选教师测试应放在阶段的 `tests-framework/`，与核心 `tests/` 分开，并从 `PROJECT_WORKSPACE` 导入学习者实现。
