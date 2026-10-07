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
      text("query", "查询", "release replicas"),
      text(
        "notes",
        "以 | 分隔的笔记",
        "deploy replicas | restore backups | café guest wifi",
      ),
      text("alias", "一个别名 from=to", "release=deploy"),
      number("k", "结果数 k", 2, 1, 3),
      number("expected", "预期笔记编号", 1, 1, 3),
    ],
    calculate(v) {
      const [from, to] = v.alias.split("=");
      const tokens = (s) => words(s).map((w) => (w === from ? to : w));
      const docs = v.notes.split("|").map(tokens);
      const df = Object.create(null);
      docs.forEach((d) => unique(d).forEach((t) => (df[t] = (df[t] || 0) + 1)));
      const idf = Object.create(null);
      for (const [term, count] of Object.entries(df)) {
        idf[term] = Math.log((1 + docs.length) / (1 + count)) + 1;
      }
      const vector = (terms) => {
        const counts = Object.create(null);
        terms.forEach((t) => {
          if (idf[t]) counts[t] = (counts[t] || 0) + idf[t];
        });
        const norm = Math.sqrt(
          Object.values(counts).reduce((s, n) => s + n * n, 0),
        );
        const weights = Object.create(null);
        for (const [term, count] of Object.entries(counts)) {
          weights[term] = count / norm;
        }
        return weights;
      };
      const q = vector(tokens(v.query));
      const ranked = docs
        .map((doc, i) => {
          const d = vector(doc),
            score = Object.entries(q).reduce(
              (sum, [t, w]) => sum + w * (d[t] || 0),
              0,
            );
          return { id: i + 1, score, matched: unique(doc).filter((t) => q[t]) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .slice(0, v.k);
      return {
        summary:
          stage === 1
            ? "规范查询词项：" + tokens(v.query).join(", ")
            : stage === 4
              ? "预期笔记 " +
                v.expected +
                (ranked.some((x) => x.id === v.expected)
                  ? " 已检索到"
                  : " 未检索到")
              : "根据你的笔记计算稀疏余弦分数。",
        metrics: [
          metric("笔记数", docs.length),
          metric("Query terms", Object.keys(q).length),
          metric(
            "前 k 个结果中命中",
            ranked.some((x) => x.id === v.expected),
          ),
        ],
        bars: ranked.map((x) => bar("笔记 " + x.id, x.score, 1)),
        columns:
          stage === 2
            ? ["词项", "文档频率", "IDF"]
            : ["笔记", "分数", "匹配词项"],
        rows:
          stage === 2
            ? Object.entries(df).map(([t, n]) => [t, n, idf[t].toFixed(4)])
            : ranked.map((x) => [
                x.id,
                x.score.toFixed(4),
                x.matched.join(", "),
              ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-1",
    Object.assign(
      {
        title: "规范化笔记并保留标识",
        steps: [
          {
            label: "文本",
            detail:
              "Orchard 操作者输入 café 时可能使用不同 Unicode 编码。对文本和别名键都执行大小写折叠与 NFC 规范化，让等价写法得到相同词项。一个别名只执行一次明确的词汇替换。",
          },
          {
            label: "大小写折叠",
            detail:
              '"CAFE\\u0301" -> ["café"]\nalias release -> deploy\n"release café" -> ["deploy","café"]',
          },
          {
            label: "别名",
            detail:
              "在 Unicode 单词正则表达式之前进行规范化，否则组合附加符号可能丢失。不要递归扩展别名，以免形成循环。",
          },
        ],
        caption:
          "什么情况下，将 release 映射到 deploy 会损害检索，而不是改善它？ 图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-2",
    Object.assign(
      {
        title: "按文档稀有程度为词项加权",
        steps: [
          {
            label: "计数",
            detail:
              "罕见运维词项比常见项目名称更能区分笔记。每份笔记对文档频率只计一次，用词频乘以平滑稀有度，再归一化各稀疏向量。",
          },
          {
            label: "加权",
            detail:
              "N=3; df(orchard)=3 -> idf=1\ndf(restore)=1 -> idf=log(4/2)+1=1.6931",
          },
          {
            label: "归一化",
            detail:
              "为每份文档构建词项集合来统计文档频率。同一笔记重复 orchard 十次，不等于它出现在十份文档中。",
          },
        ],
        caption:
          "比较短笔记和长操作手册之前，为什么要归一化向量长度？ 图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-3",
    Object.assign(
      {
        title: "用稳定的同分规则排列查询结果",
        steps: [
          {
            label: "查询",
            detail:
              "CLI 为你自己的 Markdown 目录返回路径、预览和匹配词项。查询与笔记向量使用同一别名映射和 IDF 表，未知词项没有权重。",
          },
          {
            label: "点积",
            detail:
              "query=release replicas\nalias release=deploy\nmatching note: release.md; matched terms: deploy (replica is singular in the file fixture)",
          },
          {
            label: "前 k 个结果",
            detail:
              "使用索引 IDF 计算查询向量，再与笔记向量求点积。分数相同时，按文档 ID 决定顺序。",
          },
        ],
        caption:
          "笔记使用了别名映射中没有的同义词时，空结果意味着什么？ 图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-4",
    Object.assign(
      {
        title: "引入嵌入前先测量检索效果",
        steps: [
          {
            label: "标签",
            detail:
              "加入不同检索后端前，先测量目标笔记是否靠前。随附笔记涵盖部署、恢复和访客 Wi-Fi，因此别名可能改善一个主题，却损害另一个主题。",
          },
          {
            label: "检索",
            detail:
              "labels: restore -> backup.md; café -> café.md\nhits=2,total=2,k=1 -> recall=1\nadd a misleading alias -> inspect changed hit ids",
          },
          {
            label: "分数",
            detail:
              "将已标注查询与调参示例分开。在评估中调用真实搜索函数，不要另外重建一个评分器。",
          },
        ],
        caption:
          "声称改善新手的检索效果之前，你会再收集多少新标签？ 图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
