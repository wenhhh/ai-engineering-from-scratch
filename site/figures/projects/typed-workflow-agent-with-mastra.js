(function () {
  "use strict";
  const steps = [
    { label: "契约", detail: "校验输入及所选操作。" },
    { label: "状态", detail: "区分等待和失败。" },
    { label: "副作用", detail: "通过所需门禁后才调用工具。" },
  ];
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-1", {
    title: "类型仍需要运行时校验",
    steps,
    caption:
      "关键词分类器是可检查的基线，不承担授权。",
    lab: {
      controls: [
        { key: "id", label: "工单 ID", type: "text", value: "workshop-42" },
        {
          key: "text",
          label: "消息",
          type: "text",
          value: "Update the workshop equipment label",
        },
      ],
      calculate(v) {
        const valid = v.id.trim() && v.text.trim() && v.text.length <= 10000;
        const intent = /\b(update|delete|change|cancel)\b/i.test(v.text)
          ? "write"
          : "read";
        return {
          summary: valid
            ? "工单已校验，意图为 " + intent + "。"
            : "制定计划前拒绝格式无效的工单。",
          metrics: [
            { label: "字符数", value: v.text.length },
            { label: "意图", value: valid ? intent : "none" },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-2", {
    title: "审批要求由所选工具决定",
    steps,
    caption:
      "不能只修改保存检查点的标志就关闭审批。",
    lab: {
      controls: [
        {
          key: "tool",
          label: "所选操作",
          type: "select",
          value: "update",
          options: [
            { value: "lookup", label: "lookup" },
            { value: "update", label: "update" },
          ],
        },
        {
          key: "required",
          label: "requiresApproval 标志",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const expected = v.tool === "update",
          valid = expected === v.required;
        return {
          summary: valid
            ? "计划契约内部一致。"
            : "拒绝被编辑的检查点。",
          metrics: [
            { label: "预期标志", value: String(expected) },
            { label: "保存的标志", value: String(v.required) },
          ],
          rows: [[v.tool, expected ? "副作用前先审阅" : "只读"]],
          columns: ["操作", "策略"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-3", {
    title: "成功和失败调用都计入预算",
    steps,
    caption:
      "手写运行时在修改前暂停。重试真实写入仍需幂等机制。",
    lab: {
      controls: [
        {
          key: "write",
          label: "计划包含 update",
          type: "checkbox",
          value: true,
        },
        {
          key: "approved",
          label: "已提供审批",
          type: "checkbox",
          value: false,
        },
        {
          key: "failures",
          label: "成功前的失败次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
        {
          key: "budget",
          label: "共享调用预算",
          type: "range",
          value: 3,
          min: 1,
          max: 5,
        },
      ],
      calculate(v) {
        const paused = v.write && !v.approved;
        const calls = paused ? 0 : Math.min(v.failures + 1, 2, v.budget);
        const ok = !paused && v.failures < 2 && v.failures + 1 <= v.budget;
        let summary = "达到尝试或调用上限后失败。";
        if (paused) summary = "第一次工具调用前暂停。";
        else if (ok) summary = "完成并取得可用结果。";
        return {
          summary,
          metrics: [
            { label: "调用次数", value: calls },
            { label: "每操作尝试上限", value: 2 },
          ],
          bars: [{ label: "已消耗调用", value: calls, max: v.budget }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-4", {
    title: "恢复保存的计划，而非提交新请求",
    steps,
    caption:
      "真实 SDK 将暂停状态保存在 SQLite 中。这些控件仅模拟恢复计划周围的审批门禁。",
    lab: {
      controls: [
        {
          key: "approved",
          label: "审阅人已批准",
          type: "checkbox",
          value: false,
        },
        {
          key: "ticket",
          label: "工单 ID 匹配",
          type: "checkbox",
          value: true,
        },
        {
          key: "digest",
          label: "计划摘要匹配",
          type: "checkbox",
          value: true,
        },
        {
          key: "stored",
          label: "运行存在于本地存储",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        let status = "success";
        if (!v.stored) status = "missing run";
        else if (!v.approved) status = "suspended";
        else if (!v.ticket || !v.digest) status = "failed";
        let summary = "拒绝无效恢复或不匹配的审批。";
        if (status === "success")
          summary = "使用原始操作和查询恢复 execute。";
        else if (status === "suspended")
          summary = "继续等待审批，不执行副作用。";
        return {
          summary,
          metrics: [
            { label: "SDK 结果", value: status },
            { label: "工具调用数", value: status === "success" ? 1 : 0 },
          ],
          rows: [
            ["持久上下文", "runId, ticketId, planHash, plan"],
            [
              "审阅人身份",
              "必须由集成应用执行身份认证",
            ],
          ],
          columns: ["边界", "已保存或必需的数据"],
        };
      },
    },
  });
})();
