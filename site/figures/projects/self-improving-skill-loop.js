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
      text("development", "开发集消息", "Invoice wrong"),
      text("holdout", "留出集消息", "INVOICE wrong"),
      text("groups", "开发集／留出集分组 ID", "june,august"),
      text("baseline", "各用例的基线正确性", "0,1,0"),
      text("candidate", "各用例的候选正确性", "1,1,1"),
      number("minimum", "最小准确率增益", 0.05, 0, 1, 0.05),
      check("approved", "精确候选已批准", false),
    ],
    calculate(v) {
      const normalize = (s) =>
        s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
      const [a, b] = v.groups.split(",").map((x) => x.trim());
      const contentLeak = normalize(v.development) === normalize(v.holdout),
        groupLeak = !!a && a === b;
      const old = finiteList(v.baseline),
        now = finiteList(v.candidate);
      if (
        old.length !== now.length ||
        old.concat(now).some((x) => x !== 0 && x !== 1)
      )
        throw Error("Use equal-length 0/1 correctness lists");
      const before = old.reduce((x, y) => x + y, 0) / old.length,
        after = now.reduce((x, y) => x + y, 0) / now.length,
        regressions = old.filter((n, i) => n === 1 && now[i] === 0).length;
      const eligible =
        !contentLeak &&
        !groupLeak &&
        after - before >= v.minimum &&
        !regressions;
      return {
        summary:
          contentLeak || groupLeak
            ? "泄漏导致评估被阻止"
            : eligible
              ? v.approved
                ? "候选符合条件且已明确批准"
                : "候选符合条件，等待精确批准"
              : "门禁阻止晋升",
        metrics: [
          metric("内容泄漏", contentLeak),
          metric("分组泄漏", groupLeak),
          metric("增益", (after - before).toFixed(3)),
          metric("退化数", regressions),
        ],
        bars: [
          bar("基线准确率", before, 1),
          bar("候选准确率", after, 1),
        ],
        columns: ["用例", "基线正确", "候选正确"],
        rows: old.map((x, i) => [i + 1, x, now[i]]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-1",
    Object.assign(
      {
        title: "划分标注用例并避免身份泄漏",
        steps: [
          {
            label: "输入",
            detail:
              "留出集隔离必须依据内容和分组，不能只看 ID。两个 ID 不同的工单也可能重复同一条客户消息。先规范化内容并合并相关记录，再将整个连通分量分配到一个分区。",
          },
          {
            label: "变换",
            detail:
              'id d1: "Invoice wrong"\nid h1: "INVOICE   wrong"\nfingerprint equal -> one partition, or reject explicit split',
          },
          {
            label: "验证",
            detail:
              "对连通分量计算哈希前，同时合并内容重复边和分组边。相同规范化内容若具有冲突标签，必须拒绝。",
          },
        ],
        caption:
          "同一个客户线程中的两条不同消息，能否安全地视为独立样例？ 图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-2",
    Object.assign(
      {
        title: "执行并评估透明的路由技能",
        steps: [
          {
            label: "输入",
            detail:
              "路由技能是透明的有序列表。一条规则要求所有词项均出现，首个匹配规则获胜。计算准确率前，先记录每个预期／预测对，使错误能够驱动候选提案。",
          },
          {
            label: "变换",
            detail:
              'rule terms=[password,reset], label=access\n"password reset expired" -> access\n"password rejected" -> unknown',
          },
          {
            label: "验证",
            detail:
              "对输入词项执行一次规范化。空词项集绝不能成为匹配一切的规则。",
          },
        ],
        caption:
          "宽泛的前置规则遮蔽更精确的后置规则时，会发生什么？ 图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-3",
    Object.assign(
      {
        title: "仅从开发集错误中提出规则",
        steps: [
          {
            label: "输入",
            detail:
              "仅从开发集错误提出候选。Invoice 出现在两个 billing 样例中，可以成为规则；同时用于 billing 和 access 样例的词项则存在歧义。不要将留出文本传入该函数。",
          },
          {
            label: "变换",
            detail:
              "development: invoice wrong; invoice late -> billing\nmin_support=2 -> candidate terms=[invoice]\nholdout: invoice missing -> used only after proposal",
          },
          {
            label: "验证",
            detail:
              "每个词项在每个用例中只计一次，收集其关联的全部标签。提出规则前，要求标签唯一且具有足够的独立支持。",
          },
        ],
        caption:
          "如果不去重，同一条开发消息被多次复制会导致什么问题？ 图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-4",
    Object.assign(
      {
        title: "晋升前要求独立门禁",
        steps: [
          {
            label: "输入",
            detail:
              "留出门禁通过后，生成候选摘要供人工审阅。晋升要求精确匹配该摘要，写入带版本的规则文件，并保留旧文件用于回退。公开样本工单属于示例，不是未公开基准。",
          },
          {
            label: "变换",
            detail:
              "baseline accuracy=0; candidate accuracy=1; no regression -> eligible\nwrong digest -> no write\nexact digest -> promote and retain .previous",
          },
          {
            label: "验证",
            detail:
              "将批准绑定到序列化规则内容，并在写入前重新计算摘要。不能从高分推断用户已经批准。",
          },
        ],
        caption:
          "再次编辑技能前，你会如何固定下一批留出数据？ 图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
