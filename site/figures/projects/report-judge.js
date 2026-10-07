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
      text("source", "证据", "Alice defeated Bob after 2 retries"),
      text("claim", "论断", "Bob defeated Alice after 2 retries"),
      check("cited", "引用可解析", true),
      number("threshold", "词汇阈值", 0.8, 0, 1, 0.05),
      text("deltas", "配对得分差值", "5,5,-30"),
    ],
    calculate(v) {
      const stop = new Set(["a", "an", "the", "is", "of", "and"]);
      const c = words(v.claim).filter((x) => !stop.has(x)),
        s = words(v.source).filter((x) => !stop.has(x));
      const neg = (x) =>
        unique(x.filter((t) => ["no", "not", "never", "cannot"].includes(t)))
          .sort()
          .join();
      let pos = 0;
      const ordered = c.every((w) => {
        let at = s.indexOf(w, pos);
        if (at < 0) return false;
        pos = at + 1;
        return true;
      });
      const numeric = unique(v.claim.match(/\d+(?:\.\d+)?/g) || []).every((n) =>
        (v.source.match(/\d+(?:\.\d+)?/g) || []).includes(n),
      );
      const overlap = c.length
        ? unique(c).filter((t) => s.includes(t)).length / unique(c).length
        : 0;
      const reverse = unique(c).every((t) => s.includes(t)) && !ordered;
      const reason = !c.length
        ? "empty"
        : !v.cited
          ? "uncited"
          : neg(c) !== neg(s)
            ? "negation"
            : !numeric
              ? "number"
              : reverse
                ? "order_requires_review"
                : "lexical_overlap";
      const score = reason === "lexical_overlap" ? overlap : 0,
        kept = score >= v.threshold && c.length > 0 && v.cited;
      const d = finiteList(v.deltas);
      return {
        summary:
          stage === 4
            ? "配对平均变化 " +
              (d.reduce((a, b) => a + b, 0) / d.length).toFixed(2) +
              "；逐项退步仍然可见。"
            : reason + "：词汇检查不能证明真实性。",
        metrics: [
          metric("原始词汇重叠", overlap.toFixed(3)),
          metric("约束检查后的分数", score.toFixed(3)),
          metric(
            "状态",
            !c.length ? "no_evidence" : kept ? "lexical_match" : "needs_review",
          ),
          metric("缺少参考标注", "recall / coverage unavailable"),
        ],
        bars:
          stage === 4
            ? d.map((x, i) => bar("问题 " + (i + 1), x))
            : [
                bar("词汇重叠", overlap, 1),
                bar("约束检查后的支持", score, 1),
              ],
        columns: ["检查", "结果"],
        rows: [
          ["引用", v.cited],
          ["数字一致", numeric],
          ["顺序匹配", ordered],
          ["需要人工审阅", !kept],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-report-judge-1",
    Object.assign(
      {
        title: "解析论断与引用标记",
        steps: [
          {
            label: "输入",
            detail:
              "逐句审计事实陈述。Orchard 的重试上限有来源支持，另一项部署论断与之无关；不能因为一个引用标记有效，就让整段文字通过。",
          },
          {
            label: "转换",
            detail:
              "Worker A invokes worker B [S1]. Retry limit is 99 [S2].\nclaim 1 -> cites [S1]\nclaim 2 -> cites [S2]",
          },
          {
            label: "验证",
            detail:
              "先提取标记，再从论断正文移除。对重复标记去重时，保留句子的独立身份。",
          },
        ],
        caption:
          "证据映射中没有 [S2] 时，应如何处理？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-2",
    Object.assign(
      {
        title: "计算平均分前先核查证据",
        steps: [
          {
            label: "输入",
            detail:
              '词汇重叠无法反映关系。“Bob defeated Alice”和“Alice defeated Bob”的词完全相同，却颠倒了谁战胜谁。词序不匹配时拒绝自动通过，交由人工审阅；不能将这项检查称为语义理解。',
          },
          {
            label: "转换",
            detail:
              "source: Alice defeated Bob\nclaim: Bob defeated Alice\nword overlap=1; order check=false\nresult: order_requires_review",
          },
          {
            label: "验证",
            detail:
              "先完成否定与数字检查，再比较有顺序的内容词元。这项保守规则可能拒绝正确改写，因此要显示拒绝原因。",
          },
        ],
        caption:
          "写出一个语义正确但被词汇规则拒绝的改写。人工判断它需要哪些证据？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-3",
    Object.assign(
      {
        title: "报告精确率、覆盖率与来源召回率",
        steps: [
          {
            label: "输入",
            detail:
              "空报告没有证据，因此得零分。召回率和事实覆盖率需要标注；没有标注时指标不可用，不能自动记为满分。只有获得支持的论断才可计入来源召回率或覆盖率。",
          },
          {
            label: "转换",
            detail:
              "empty claims -> score 0, state no_evidence\n3 lexical matches, no reference labels -> recall null, coverage null\nscore is computed only from available metrics",
          },
          {
            label: "验证",
            detail:
              "统一维护获得支持的论断集合，再据此计算各项证据指标。不能让没有对应来源的引用抬高来源召回率。",
          },
        ],
        caption:
          "为什么词汇匹配得分为 100 时，召回率仍可能不可用？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-4",
    Object.assign(
      {
        title: "使用自助法区间比较配对版本",
        steps: [
          {
            label: "输入",
            detail:
              "在报告修改前后比较相同问题。简单题上的提升可能掩盖某道题的严重退步，因此应在自助法区间旁保留逐题差值。",
          },
          {
            label: "转换",
            detail:
              "baseline: q1=80,q2=70,q3=90\ncandidate: q1=85,q2=75,q3=60\ndeltas: +5,+5,-30; q3 remains a regression",
          },
          {
            label: "验证",
            detail:
              "使用确定性种子对配对差值重采样。区间描述当前有标注的样本，不能代表未来所有报告的事实准确率。",
          },
        ],
        caption:
          "再复制一份 q1，会产生独立证据吗？ 图表范围：第四阶段控件只展示配对平均变化，没有执行 Python compare 中的自助重采样区间。字符串分词和空输入处理也属于简化演示，不应代替实现契约测试。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
