# 研究报告智能体（Research Report Agent）

第 2 级，构建者。预计约 20 小时。使用 Rust、Python 和 TypeScript 标准库，可离线运行。需要 Python 3.10+、rustc 和 Node 22.18+。

将一个问题和一组文档转换成逐句可检查的报告。你将实现深度研究工具使用的流水线：检索、片段抽取、规划、带引用写作、论断验证、发布和评估。

```figure
pj-rra-pipeline
```

Rust 负责排名，Python 负责证据与编排，TypeScript 负责发布。两个跨语言边界都使用可检查的 JSON。模型回放保持测试确定性，在线模型为可选项。

## 最终交付物

```bash
python3 projects/research-report-agent/solution/run_report.py \
  "How does a secrets proxy protect API keys from prompt injection?" --out out/ --code my-report-agent
```

- `out/report.html`：带编号脚注的各个章节。每个脚注引用精确的来源句子，并链接到原页面。
- `out/report.json`：供 TypeScript 阅读器使用的版本化证据契约。
- `out/trace.json`：运行 ID、各步骤耗时与计数、预算使用情况，以及终止状态（`completed`、`needs_review` 或 `failed`）。
- 基于已签入仓库的公开评估夹具生成的评分表，各组成指标均可比较和分享。

## 阶段

| # | 阶段 | 你要实现的内容 | 难度 |
|---|---|---|---|
| 1 | 检索语料库 | `search/main.rs`、Python 适配器（BM25） | 入门（starter） |
| 2 | 抽取可引用片段 | `snippets.py`（句子区间、偏移量） | 入门（starter） |
| 3 | 规划研究 | `planner.py`、`model.py`（回放记录、回退） | 核心（core） |
| 4 | 只根据证据写作 | `citations.py`、`writer.py` | 核心（core） |
| 5 | 验证每项论断 | `critic.py`（支持规则、预算、终止状态） | 核心（core） |
| 6 | 发布报告 | `publish.py`、`pipeline.py`、`viewer/render.ts` | 核心（core） |
| 7 | 对公开夹具评分 | `evaluate.py` | 进阶（stretch） |

## 开始

```bash
python3 scripts/project_test.py research-report-agent --init my-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path my-report-agent
```

阅读 `stages/01-search-the-corpus/docs/en.md`，补全 `my-report-agent/report_agent/` 中的起始实现，反复运行直到第 1 阶段通过。后续每个阶段都会重跑此前所有阶段，因此回归问题会立即暴露。

遇到困难时，可以参考 `solution/` 中的实现。先自行尝试，再阅读参考解答。

## 目录结构

```text
project.json        metadata the site and the grader read
fixtures/corpus/    12 original concept notes with supporting official sources
fixtures/questions.json       development questions
fixtures/cassettes/planner.json  recorded model replies for stage 3
heldout/            public evaluation questions and poisoned drafts (legacy folder name)
stages/NN-*/docs/en.md        the lesson for each stage
stages/NN-*/starter/          stubs copied by --init
stages/NN-*/tests/            the tests the grader runs
solution/           reference implementation and run_report.py
```

## 使用自己的文档

将 `--corpus` 指向任意 Markdown 文件目录。每个文件以 `title:`、`source_url:` 和 `published:` 三行开头，随后依次为空行和正文。

## 已验证的参考输出

secrets-proxy 示例生成 4 个章节、10 个句子，没有被删除的论断，状态为 `completed`。鼠标悬停或键盘聚焦脚注时可查看精确证据，展开运行轨迹可检查五个流水线步骤。参考基线在六个已签入的公开评估问题上得分为 87.5 / 100。演示重复使用该文件中的 h4，因此这是可复现的夹具分数，不能视作未见评估的证据。词汇验证不能证明现实世界中的真实性。


## 检查来源更新

原创 Orchard 语料是虚构的运维文档。使用同一问题运行前后两个版本，再检查 `orchard-after/changes.json`。

```bash
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code projects/research-report-agent/solution --corpus projects/research-report-agent/examples/orchard/before --out orchard-before
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code projects/research-report-agent/solution --corpus projects/research-report-agent/examples/orchard/after --compare orchard-before/report.json --out orchard-after
```

默认采用确定性规划和抽取式写作。--model replay 需要配合 --cassette；--model live 通过 RRA_LLM_BASE_URL、RRA_LLM_MODEL 和可选的 RRA_LLM_API_KEY，仅为规划阶段调用模型。在线服务行为需要使用调用方凭据另行运行验证。公开夹具得分不能衡量未见数据上的泛化能力。

译注：语料、模型提示、规划模板、原始引文、机器状态及评分表保留英文，以维持排名、回放哈希和精确区间契约；固定页面文案与帮助已译。核心分词主要处理英文字符和数字，不能把中文界面视为已具备中文语义检索。LiveModel 仅为教学适配器，未提供完整端点、重定向和响应大小防护；网络异常也不都被规划回退分支捕获。本批不使用外部凭据。
