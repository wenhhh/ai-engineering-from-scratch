(function () {
  "use strict";
  const steps = [
    { label: "校验", detail: "应用共用的确定性边界。" },
    { label: "选择", detail: "将路由与能力分开。" },
    {
      label: "保留",
      detail: "保存可检查的证据和回复状态。",
    },
  ];
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-1", {
    title: "在任何模型请求前脱敏",
    steps,
    caption:
      "这两种文档规定的模式仅为有限示例，不是完整隐私过滤器。 图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单文本",
          type: "text",
          value: "invoice for learner@example.invalid api_key=EXAMPLE_VALUE",
        },
      ],
      calculate(v) {
        const clean = v.text
          .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
          .replace(/(api[_ -]?key\s*[:=]\s*)\S+/gi, "$1[redacted]");
        const valid = v.text.trim() && v.text.length <= 10000;
        return {
          summary: valid
            ? "只有清理后的文本可进入会话。"
            : "拒绝该工单。",
          metrics: [
            { label: "输入字符数", value: v.text.length },
            {
              label: "经过过滤发生变化",
              value: clean === v.text ? "no" : "yes",
            },
          ],
          rows: [["清理后的工单", clean]],
          columns: ["边界", "文本"],
        };
      },
    },
  });
  const routes = {
    billing: ["invoice", "refund", "payment"],
    access: ["password", "login", "account"],
    platform: ["outage", "latency", "error"],
  };
  const tools = {
    billing: "read_invoice",
    access: "read_account",
    platform: "read_status",
  };
  function route(text) {
    const words = new Set(text.toLowerCase().match(/\w+/g) || []),
      scores = Object.entries(routes)
        .map(([key, terms]) => [key, terms.filter((t) => words.has(t)).length])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return {
      scores,
      selected:
        !scores[0][1] || scores[0][1] === scores[1][1] ? "human" : scores[0][0],
    };
  }
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-2", {
    title: "将路由分数与权限分开",
    steps,
    caption:
      "同分时转人工。有效专员也不能使用另一专员的工具。 图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单文本",
          type: "text",
          value: "invoice login",
        },
        {
          key: "tool",
          label: "请求的能力",
          type: "select",
          value: "read_invoice",
          options: Object.values(tools).map((value) => ({
            value,
            label: value,
          })),
        },
      ],
      calculate(v) {
        const r = route(v.text),
          allowed = tools[r.selected] === v.tool;
        let summary = "拒绝请求的能力。";
        if (r.selected === "human")
          summary = "在运行模型或只读能力前转人工。";
        else if (allowed) summary = "授权 " + v.tool;
        return {
          summary,
          metrics: [
            { label: "路由", value: r.selected },
            { label: "已允许", value: allowed ? "yes" : "no" },
          ],
          bars: r.scores.map(([label, value]) => ({ label, value, max: 3 })),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-3", {
    title: "回复必须在状态转换后保留",
    steps,
    caption:
      "终止状态不能接收下一事件。human 路由只允许转人工，不能自动回答。 图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。",
    lab: {
      controls: [
        {
          key: "state",
          label: "当前状态",
          type: "select",
          value: "routed",
          options: ["received", "routed", "answered", "escalated"].map(
            (value) => ({ value, label: value }),
          ),
        },
        {
          key: "event",
          label: "事件",
          type: "select",
          value: "respond",
          options: ["classify", "respond", "escalate"].map((value) => ({
            value,
            label: value,
          })),
        },
        { key: "human", label: "人工路由", type: "checkbox", value: false },
        {
          key: "text",
          label: "回复文本",
          type: "text",
          value: "Use the receipt invoice reference.",
        },
      ],
      calculate(v) {
        const next = {
          received: { classify: "routed" },
          routed: { respond: "answered", escalate: "escalated" },
        }[v.state]?.[v.event];
        const valid =
          next && !(v.event === "respond" && (v.human || !v.text.trim()));
        return {
          summary: valid
            ? "转换为 " + next
            : "拒绝转换，保留此前状态。",
          metrics: [{ label: "下一状态", value: valid ? next : v.state }],
          rows: [
            [
              "保留的回复",
              valid && v.event === "respond" ? v.text.trim() : "none",
            ],
          ],
          columns: ["会话字段", "值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-4", {
    title: "调用 ADK 前应用同一门禁",
    steps,
    caption:
      "真实 SDK 测试验证图的行为。确定性夹具模型已明确标识，不证明语言模型质量。 图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单主题",
          type: "text",
          value: "account login",
        },
        {
          key: "proposed",
          label: "模型建议的路由",
          type: "select",
          value: "access",
          options: ["billing", "access", "platform"].map((value) => ({
            value,
            label: value,
          })),
        },
      ],
      calculate(v) {
        const r = route(v.text);
        const valid = r.selected !== "human" && r.selected === v.proposed;
        let summary = "运行 ADK 前拒绝路由覆盖。";
        if (r.selected === "human")
          summary = "转人工：没有 ADK 模型调用。";
        else if (valid)
          summary =
            "用清理后的文本和已授权指引运行分流与专员。";
        return {
          summary,
          metrics: [
            { label: "获准路由", value: r.selected },
            { label: "模型调用次数", value: valid ? 2 : 0 },
          ],
          rows: [
            ["只读能力", valid ? tools[r.selected] : "none"],
            [
              "回复状态",
              valid ? "已回答并保留草稿" : "没有自动回答",
            ],
          ],
          columns: ["门禁结果", "值"],
        };
      },
    },
  });
})();
