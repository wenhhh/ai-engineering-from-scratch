(function () {
  "use strict";
  const number = (key, label, value, min = 0, max = 100, step = 1) => ({
    key,
    label,
    type: "range",
    value,
    min,
    max,
    step,
  });
  const text = (key, label, value) => ({ key, label, type: "text", value });
  const check = (key, label, value) => ({
    key,
    label,
    type: "checkbox",
    value,
  });
  const select = (key, label, value, options) => ({
    key,
    label,
    type: "select",
    value,
    options: options.map((x) => ({ value: x, label: x })),
  });
  const metric = (label, value) => ({ label, value });
  const bar = (label, value, max) => ({ label, value, max });
  const words = (s) =>
    s
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) || [];
  const unique = (xs) => [...new Set(xs)];
  const finiteList = (s) =>
    s.split(",").map((x) => {
      const n = Number(x.trim());
      if (!Number.isFinite(n))
        throw Error("Use comma-separated finite numbers");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text(
        "rule",
        "区分大小写的纠正",
        "Read API_KEY; never rename it to api_key.",
      ),
      text(
        "sessions",
        "来源会话（逗号分隔）",
        "review-a,review-a,review-b",
      ),
      text("scope", "规则适用范围", "orchard"),
      text("activeScope", "当前范围", "orchard"),
      select("state", "规则状态", "candidate", [
        "candidate",
        "approved",
        "retired",
      ]),
      number("minimum", "所需独立会话数", 2, 1, 5),
    ],
    calculate(v) {
      const normalized = v.rule.trim().replace(/\s+/g, " "),
        sessions = unique(
          v.sessions
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ),
        enough = sessions.length >= v.minimum;
      const scope = v.scope.trim().toLowerCase(),
        match =
          scope === "global" || scope === v.activeScope.trim().toLowerCase(),
        inject = v.state === "approved" && match;
      return {
        summary:
          stage === 1
            ? "保存规则时保留大小写：" + normalized
            : inject
              ? "注入已批准且范围匹配的规则及证据"
              : v.state === "retired"
                ? "已退役规则被排除"
                : !match
                  ? "范围不匹配"
                  : enough
                    ? "会话支持足够，仍需明确审批"
                    : "独立会话不足",
        metrics: [
          metric("独立会话数", sessions.length),
          metric(
            "重复投递次数",
            v.sessions.split(",").filter((x) => x.trim()).length -
              sessions.length,
          ),
          metric("范围匹配", match),
          metric("注入规则", inject),
        ],
        bars: [
          bar("独立支持", sessions.length, v.minimum),
          bar("所需支持", v.minimum),
        ],
        columns: ["会话", "证据定位信息"],
        rows: sessions.map((s, i) => [
          s,
          "session:" + s + "#correction-" + (i + 1),
        ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-1",
    Object.assign(
      {
        title: "记录带来源的纠正",
        steps: [
          {
            label: "输入契约",
            detail:
              "纠正来自特定会话及来源定位信息，是一条证据。保留规则中 API_KEY 的精确大小写；大小写折叠会把有用指令变成相互矛盾的指令。",
          },
          {
            label: "记录带来源的纠正",
            detail:
              "rule: Read API_KEY; never rename it to api_key.\nscope: Orchard -> orchard\nsource locator: local:orchard/config.py:12",
          },
          {
            label: "观察结果",
            detail:
              "规范化 scope 以便匹配；规则只合并空白。明显类似凭据的内容须在进入持久存储前拒绝。",
          },
        ],
        caption:
          "调用方必须在导入前清理来源引文中的哪些内容？ 图表限制：控件展示会话支持和规则状态，不执行 ingest 的凭据模式／长度检查、真实摘要审批或持久存储。批准状态来自手动选择，不证明存在人工审批记录。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-2",
    Object.assign(
      {
        title: "统计独立会话",
        steps: [
          {
            label: "输入契约",
            detail:
              "重复投递不是独立证据。同一会话中的两条不同纠正，仍只贡献一个支持会话。将引文及定位信息与候选规则放在一起，使来源 ID 后续仍可解析。",
          },
          {
            label: "统计独立会话",
            detail:
              "events a1,a2 from session A -> sessions=[A]\nevent b1 from session B -> sessions=[A,B]\nrule remains candidate until approval",
          },
          {
            label: "观察结果",
            detail:
              "根据完整已校验内容对事件 ID 去重。同一 ID 的冲突复用必须失败，不能悄悄覆盖来源证据。",
          },
        ],
        caption:
          "为什么 API_KEY 与 api_key 规则应保持为不同候选？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-3",
    Object.assign(
      {
        title: "批准并选择限定范围的规则",
        steps: [
          {
            label: "输入契约",
            detail:
              "审批针对准确的候选摘要。第二条来源可能改变摘要，需要重新审阅。退役规则后，后续输出上下文不再包含它，但证据仍可检查。",
          },
          {
            label: "批准并选择限定范围的规则",
            detail:
              "candidate -> inspect approval_digest\napprove exact digest -> approved\nemit orchard -> original rule + evidence\nretire -> next emit omits rule",
          },
          {
            label: "观察结果",
            detail:
              "同时应用状态和 scope 过滤。不能让 global 候选或高频重复候选绕过明确审批。",
          },
        ],
        caption:
          "新证据到达后，用户仍提供昨天的摘要，CLI 应如何处理？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-workflow-hooks-4",
    Object.assign(
      {
        title: "跨会话持久化规则",
        steps: [
          {
            label: "输入契约",
            detail:
              "CLI 收集 JSONL 纠正并保存带版本的存储，再由另一个进程重新加载，输出中立的 JSON hook 载荷。它保留证据、支持退役，并在重启后精确保留 API_KEY。",
          },
          {
            label: "跨会话持久化规则",
            detail:
              "capture -> store.json\napprove -> stored state approved\nemit -> additional_context plus evidence locators\nmalformed store -> error, not empty success",
          },
          {
            label: "观察结果",
            detail:
              "写入唯一的同目录临时文件后重命名。此存储契约只允许单写者；支持同时写入前先增加锁。",
          },
        ],
        caption:
          "你的智能体集成如何将 additional_context 映射到文档规定的 hook 消息格式？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
