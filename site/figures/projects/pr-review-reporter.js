(function () {
  "use strict";
  const controls = [
    {
      key: "start",
      label: "新文件差异块起始行",
      type: "range",
      value: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "context",
      label: "新增行之前的上下文行数",
      type: "range",
      value: 2,
      min: 0,
      max: 8,
      step: 1,
    },
    {
      key: "removed",
      label: "新增行之前的删除行数",
      type: "range",
      value: 3,
      min: 0,
      max: 8,
      step: 1,
    },
    {
      key: "line",
      label: "新增源码行",
      type: "text",
      value: "eval(input);",
    },
    {
      key: "quote",
      label: "评审者引文",
      type: "text",
      value: "eval(input)",
    },
    {
      key: "comment",
      label: "该行是注释",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const source = (v.comment ? "// " : "") + v.line,
      anchored = !!v.quote.trim() && source.includes(v.quote),
      detected =
        !/^\s*(?:\/\/|\*|#)/.test(source) && /\beval\s*\(/.test(source);
    return {
      summary: !anchored
        ? "拒绝伪造引文"
        : detected
          ? "已有定位的词法候选，供人工审阅"
          : "本行没有 dynamic-eval 候选问题",
      metrics: [
        { label: "新文件新增行号", value: v.start + v.context },
        { label: "影响新行号的删除行数", value: 0 },
        { label: "引文有来源支持", value: anchored },
      ],
      bars: [
        { label: "已消费的旧文件行数", value: v.context + v.removed, max: 16 },
        {
          label: "新增之前已消费的新文件行数",
          value: v.context,
          max: 16,
        },
      ],
      columns: ["字段", "值"],
      rows: [
        ["位置", "src/run.ts:" + (v.start + v.context)],
        ["源码", source],
        ["引文", v.quote],
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-1",
    Object.assign(
      {
        title: "恢复新文件行号",
        steps: [
          { label: "输入契约", detail: "parseDiff" },
          {
            label: "恢复新文件行号",
            detail:
              "从差异块头解析旧文件与新文件的行计数。上下文行同时推进两个计数器；删除行只推进旧文件计数器；新增行推进新文件计数器，并产生可审阅的位置。拒绝截断的差异块和向父目录穿越的路径。解析器仅处理文本统一 diff；二进制补丁与合并提交的 combined diff 不在契约内。通过 execFileSync 和标准输入将 Python 接入 TypeScript，不要拼接 shell 命令。",
          },
          {
            label: "观察结果",
            detail:
              "即使旧文件侧删除多行，替换内容仍定位到新文件行号。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-2",
    Object.assign(
      {
        title: "生成范围明确的评审候选问题",
        steps: [
          { label: "输入契约", detail: "inspect" },
          {
            label: "生成范围明确的评审候选问题",
            detail:
              "为动态 eval、shell exec、禁用 TLS 校验和空 catch 处理器构建明确的静态检测规则，只检查新增行。这些模式产生评审候选问题，不能证明存在可利用行为。保持规则 ID 稳定，便于后续模型评审者提出相同疑点时去重。",
          },
          {
            label: "观察结果",
            detail:
              "夹具产生高严重程度的 eval 候选问题，保留逐字引文及新文件第 2 行定位。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-3",
    Object.assign(
      {
        title: "校验并合并问题",
        steps: [
          { label: "输入契约", detail: "verify, merge" },
          {
            label: "校验并合并问题",
            detail:
              "每个候选问题都必须对应确实存在的新增行位置，并提供非空、逐字匹配的源码子串。拒绝虚构文件、已删除行的位置、空引文和无效严重程度。按文件、行号和规则合并问题；评审者意见不同时保留更高严重程度。引文校验只能确认位置有证据支持，安全判断是否成立仍需审阅。",
          },
          {
            label: "观察结果",
            detail:
              "无来源支持的候选保留在拒绝集合中，有来源支持的重复候选合并成一个问题。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-pr-review-reporter-4",
    Object.assign(
      {
        title: "发布经过转义的本地报告",
        steps: [
          { label: "输入契约", detail: "escapeHTML, render" },
          {
            label: "发布经过转义的本地报告",
            detail:
              "渲染自包含报告，包含源码位置、证据引文、严重程度和消息。对源码文本与说明文字同样仔细转义，因为 diff 中可能包含可执行 HTML。工具不负责向外发布。命令行程序在本地写入 review.html，并打印机器可读摘要供自动化使用。",
          },
          {
            label: "观察结果",
            detail:
              "打开 review.html 检查已定位的问题。源码引文即使包含 HTML，也会按文本显示。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
