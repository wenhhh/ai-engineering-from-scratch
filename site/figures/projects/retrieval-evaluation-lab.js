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
      text("grades", "相关性标注 id:grade", "a:3,b:1,c:0"),
      text("order", "候选排名", "b,a,c"),
      text("baseline", "基线排名", "c,b,a"),
      number("k", "截断值 k", 3, 1, 6),
    ],
    calculate(v) {
      const grade = {};
      v.grades.split(",").forEach((part) => {
        const [id, raw] = part.trim().split(":");
        const n = Number(raw);
        if (!id || !Number.isInteger(n) || n < 0 || n > 3 || id in grade)
          throw Error("Unique ids with grades 0..3 required");
        grade[id] = n;
      });
      const rank = (s) => {
        const ids = s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (unique(ids).length !== ids.length)
          throw Error("Ranking contains duplicate ids");
        return ids;
      };
      const ideal = Object.values(grade)
        .sort((a, b) => b - a)
        .slice(0, v.k)
        .reduce((sum, n, i) => sum + (2 ** n - 1) / Math.log2(i + 2), 0);
      const calculate = (ids) => {
        const top = ids.slice(0, v.k),
          hits = top.filter((id) => grade[id] > 0).length,
          relevant = Object.values(grade).filter((n) => n > 0).length;
        const dcg = top.reduce(
          (sum, id, i) => sum + (2 ** (grade[id] || 0) - 1) / Math.log2(i + 2),
          0,
        );
        return {
          precision: hits / v.k,
          recall: relevant ? hits / relevant : 0,
          dcg,
          ndcg: ideal ? dcg / ideal : 0,
          unjudged: top.filter((id) => !(id in grade)).length,
        };
      };
      const ids = rank(v.order),
        a = calculate(rank(v.baseline)),
        b = calculate(ids);
      return {
        summary:
          stage === 4
            ? "NDCG 变化 " +
              (b.ndcg - a.ndcg).toFixed(4) +
              (b.ndcg < a.ndcg ? " = 退步" : "")
            : stage === 1
              ? "已校验排名证据的唯一性。"
              : "根据可编辑的排序计算折损增益。",
        metrics: Object.entries(b).map(([key, val]) =>
          metric(key, typeof val === "number" ? Number(val.toFixed(4)) : val),
        ),
        bars: [
          bar("基线 NDCG", a.ndcg, 1),
          bar("候选 NDCG", b.ndcg, 1),
        ],
        columns: ["名次", "文档", "相关性", "折损增益"],
        rows: ids
          .slice(0, v.k)
          .map((id, i) => [
            i + 1,
            id,
            grade[id] ?? "unjudged",
            ((2 ** (grade[id] || 0) - 1) / Math.log2(i + 2)).toFixed(4),
          ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-1",
    Object.assign(
      {
        title: "校验排名与分级相关性标注",
        steps: [
          {
            label: "排名",
            detail:
              "排名是由唯一文档 ID 组成的有序列表。Orchard 恢复查询采用分级证据：完整恢复流程比发布说明中的顺带提及更有用。",
          },
          {
            label: "标注",
            detail:
              "judgments: restore=3, release=1, cafe=0\nranking: [release, restore, restore] -> duplicate error",
          },
          {
            label: "契约",
            detail:
              "评分前先校验排名与标注。保留未评判文档的状态，不应假设它们已被审阅并判为不相关。",
          },
        ],
        caption:
          "语料库刚增加一份笔记时，缺少该文档的相关性判断意味着什么？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-2",
    Object.assign(
      {
        title: "计算前 k 项精确率与召回率",
        steps: [
          {
            label: "截断",
            detail:
              "当 k=2 时，检索到一份相关笔记和一份无关笔记，精确率为 1/2。如果标注中共有两份相关笔记，召回率也为 1/2。数值虽然相同，两个分母的来源却不同。",
          },
          {
            label: "命中",
            detail:
              "ranking[:2]=[restore,cafe]\nrelevant labels={restore,release}\nprecision=1/2; recall=1/2",
          },
          {
            label: "分母",
            detail:
              "只有正相关性等级才计为相关，不能仅凭文档出现在标注映射中就计入。结果不足时，也保持原先指定的截断值。",
          },
        ],
        caption:
          "为什么增大 k 可能提高召回率，却降低精确率？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-3",
    Object.assign(
      {
        title: "奖励排在前面的有用证据",
        steps: [
          {
            label: "名次",
            detail:
              "应让更有价值的证据排在前面。在原例给出的 3 与 1 两个等级下，先返回较弱来源会降低折损增益，即使检索到的文档集合没有变化。",
          },
          {
            label: "折损",
            detail:
              "ranking [release,restore]: DCG=1 + 7/log2(3)=5.4165\nideal [restore,release]: DCG=7 + 1/log2(3)=7.6309\nNDCG=0.7098",
          },
          {
            label: "规范化",
            detail:
              "使用增益 2^relevance-1 和折损分母 log2(rank+1)，再以相同截断值下的最佳标注排序作归一化。",
          },
        ],
        caption: "如果全部标注增益均为零，NDCG 应返回什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-4",
    Object.assign(
      {
        title: "逐查询比较检索系统",
        steps: [
          {
            label: "对齐",
            detail:
              "随附的三个查询夹具中，release 和 café 检索得到改善，restore 检索却退步。应对查询级差值排序，先展示丢失的恢复证据，再展示汇总结果。",
          },
          {
            label: "测量",
            detail:
              "release: improved\ncafe: improved\nrestore: regressed\n--fail-on-regression -> exit 1",
          },
          {
            label: "汇总",
            detail:
              "根据相关性标注的查询 ID 对齐各系统。每个差值都保留修改前后的排名 ID；单独一个数值无法指出哪个来源发生位移。",
          },
        ],
        caption: "平均 NDCG 上升时，应先审阅哪个查询？ 图表范围：控件演示单查询排名与相关性，不执行 Python 多查询宏平均的完整输入校验。指标英文键保留：precision 精确率、recall 召回率、dcg 折损增益、ndcg 归一化折损增益、unjudged 未评判数量。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
