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
      text("query", "请求", "release replicas"),
      text(
        "keywords",
        "技能关键词（逗号分隔）",
        "release,replicas,release",
      ),
      text(
        "files",
        "变更路径（逗号分隔）",
        "deploy/orchard.yaml,deploy/orchard.yaml",
      ),
      number("competitor", "第二个技能的分数", 6, 0, 20),
      number("margin", "必需分数差", 2, 0, 6),
      check("permission", "依赖项具有读取权限", true),
    ],
    calculate(v) {
      const q = new Set(words(v.query)),
        keywords = unique(
          v.keywords
            .split(",")
            .map((x) => x.trim().normalize("NFC").toLowerCase()),
        ).filter((w) => words(w).some((t) => q.has(t)));
      const paths = unique(
        v.files.split(",").map((x) => x.trim().replaceAll("\\", "/")),
      ).filter((p) => p.startsWith("deploy/") && !p.split("/").includes(".."));
      const score = keywords.length * 2 + paths.length * 3;
      const status =
        score === 0
          ? "no-match"
          : Math.abs(score - v.competitor) < v.margin
            ? "ambiguous"
            : v.competitor > score
              ? "other skill leads"
              : !v.permission
                ? "blocked"
                : "ready";
      return {
        summary:
          status +
          (status === "ready" ? ": check-tests -> release-review" : ""),
        metrics: [
          metric("关键词分", keywords.length * 2),
          metric("路径分", paths.length * 3),
          metric("重复项贡献", "0"),
          metric("分数差", Math.abs(score - v.competitor)),
        ],
        bars: [bar("发布审阅", score), bar("其他技能", v.competitor)],
        columns: ["证据", "分数贡献"],
        rows: keywords
          .map((w) => ["keyword:" + w, 2])
          .concat(paths.map((p) => ["path:" + p, 3])),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-router-1",
    Object.assign(
      {
        title: "解析带类型的技能目录",
        steps: [
          {
            label: "输入契约",
            detail:
              "从 SKILL.md 中的名称与描述发现技能，再将 routing.json 作为本地路由扩展读取。目录名必须与技能名一致。路由元数据不属于可移植技能格式。",
          },
          {
            label: "解析带类型的技能目录",
            detail:
              "skills/release-review/SKILL.md -> name release-review\nrouting.json -> keywords,paths,priority,requires,permissions",
          },
          {
            label: "观察结果",
            detail:
              "使用 parseSkill 校验合并后的记录。解析发现文件前，拒绝符号链接和超大文件。",
          },
        ],
        caption:
          "目录 release-review 声明名称为 publish 时，应如何处理？ 图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-2",
    Object.assign(
      {
        title: "为关键词与仓库路径评分",
        steps: [
          {
            label: "输入契约",
            detail:
              "重复证据不能抬高匹配分数。Orchard 请求重复列出同一条变更路径，但路径分只能计一次。关键词每项计两分，不同的匹配路径每条计三分。",
          },
          {
            label: "为关键词与仓库路径评分",
            detail:
              "keywords release,replicas -> 4 points\nfiles deploy/orchard.yaml repeated twice -> 3 points\nscore=7, not 10",
          },
          {
            label: "观察结果",
            detail:
              "评分前先规范化路径分隔符并去重。每条计分原因都必须对应实际计入的证据。",
          },
        ],
        caption:
          "两条不同的路径规则命中同一个文件，应算作两次独立观察吗？ 图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-3",
    Object.assign(
      {
        title: "执行前解析依赖关系",
        steps: [
          {
            label: "输入契约",
            detail:
              "选中 release-review 后，需要先处理 check-tests。深度优先遍历将依赖项放在选中技能之前，并检查整个依赖图中的权限。任一依赖项被拒绝，都会阻断整个计划。",
          },
          {
            label: "执行前解析依赖关系",
            detail:
              "release-review requires check-tests\nallowed=[read]\nplan=[check-tests,release-review]",
          },
          {
            label: "观察结果",
            detail:
              "分别维护 active 和 visited 集合：前者检测环，后者避免重复执行。在依赖项之前，不能先把父技能加入输出。",
          },
        ],
        caption:
          "如果 check-tests 还需要网络权限，会发生什么？ 图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-4",
    Object.assign(
      {
        title: "遇到歧义或阻断时放弃路由",
        steps: [
          {
            label: "输入契约",
            detail:
              "两个技能分数过于接近，或选中计划需要尚未授予的权限时，应放弃路由。解释为何停止，比随意指定一个获胜技能更有用。",
          },
          {
            label: "遇到歧义或阻断时放弃路由",
            detail:
              "publish request -> release-publish score 2\nallowed=[read]; publish requires network\nstatus=blocked, no execution plan",
          },
          {
            label: "观察结果",
            detail:
              "依赖规划之前先应用分数差门槛。排名提供选择依据，并不授予工具执行权限。",
          },
        ],
        caption:
          "如何调整一个有歧义的关键词，同时避免对示例请求过拟合？ 图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
