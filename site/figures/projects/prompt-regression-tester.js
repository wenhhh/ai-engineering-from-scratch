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
      text("baseline", "基线响应", '{"source":"source: notes.md"}'),
      text("candidate", "候选响应", "Ready. source: notes.md"),
      text("required", "必需子串", "source:"),
      number("minimum", "最低通过比例", 1, 0, 1, 0.1),
      number("budget", "允许的回归数量", 0, 0, 2),
    ],
    calculate(v) {
      const score = (s) => {
        let valid = true;
        try {
          JSON.parse(s);
        } catch {
          valid = false;
        }
        return [valid, s.includes(v.required)];
      };
      const a = score(v.baseline),
        b = score(v.candidate);
      const regressions = a.filter((x, i) => x && !b[i]).length;
      const passes = b.filter(Boolean).length;
      const ship = passes / 2 >= v.minimum && regressions <= v.budget;
      return {
        summary:
          stage === 4
            ? (ship ? "放行" : "阻止") +
              "：由配对检查控制决策。"
            : "分别比较 JSON 语法与来源标注。",
        metrics: [
          metric("候选通过的检查数", passes + "/2"),
          metric("回归数量", regressions),
          metric("决策", ship ? "ship" : "block"),
        ],
        bars: [
          bar("基线通过的检查数", a.filter(Boolean).length, 2),
          bar("候选通过的检查数", passes, 2),
        ],
        columns: ["承诺行为", "基线", "候选", "变化"],
        rows: ["JSON 语法", "来源定位"].map((s, i) => [
          s,
          a[i],
          b[i],
          a[i] === b[i] ? "stable" : b[i] ? "improved" : "regressed",
        ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-1",
    Object.assign(
      {
        title: "评分前校验用例",
        steps: [
          {
            label: "用例",
            detail:
              "Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 和 `source-link` 保持为不同的用例 ID，因为它们分别对应向调用方承诺的两项行为。比较运行结果前，响应记录先对包括提示词与检查项在内的完整用例列表计算哈希。",
          },
          {
            label: "校验",
            detail:
              'case ids: [format-json, source-link]\nchecks: json; contains("source:")\nrepeat format-json -> reject before replay',
          },
          {
            label: "固定",
            detail:
              "在校验时构建 ID 集合。查找已记录响应前，先校验每项检查的类型。",
          },
        ],
        caption:
          "只改变提示词措辞。为什么之前的用例哈希必须不再匹配？ 图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-2",
    Object.assign(
      {
        title: "无需模型即可为记录输出评分",
        steps: [
          {
            label: "回放",
            detail:
              "有效 JSON 响应仍可能遗漏来源。逐项为断言评分并保留各项结果，让维护者知道哪项承诺未被满足。",
          },
          {
            label: "断言",
            detail:
              'response: {"answer":"ready"}\njson -> true\ncontains("source:") -> false\ncase passed -> false',
          },
          {
            label: "证据",
            detail:
              "先计算检查列表，再应用 all()。缺失响应不能变成默认通过的空检查列表。",
          },
        ],
        caption:
          "执行 excludes 检查前先把响应转成小写，会改变针对 API_KEY 的契约吗？ 图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-3",
    Object.assign(
      {
        title: "跨修订版比较相同用例",
        steps: [
          {
            label: "基线",
            detail:
              "候选版本修复了来源标注，却用友好的自然语言替代机器可读的 JSON。计算平均值前先配对用例 ID：一项改善无法修复另一个损坏的接口。",
          },
          {
            label: "候选",
            detail:
              "format-json: pass -> fail = regressed\nsource-link: fail -> pass = improved\naggregate pass rate: unchanged",
          },
          {
            label: "配对",
            detail:
              "在响应旁保留模型、设置和用例哈希。模型或设置改变时，命令行程序会拒绝比较，除非你明确允许这种实验。",
          },
        ],
        caption:
          "面对通过率不变的结果，应如何向依赖 JSON 输出的程序负责人解释？ 图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-prompt-regression-tester-4",
    Object.assign(
      {
        title: "根据明确容限设置发布门禁",
        steps: [
          {
            label: "阈值",
            detail:
              "发布门禁是可执行策略。三个用例中有一项回归时，即使其他响应有所改善，候选版本也会被阻止。将 JSON 和 Markdown 差异报告保存为持续集成产物。",
          },
          {
            label: "证据",
            detail:
              "cases=3; candidate passes=2; regressions=1\nminimum pass fraction=1; regression budget=0\ndecision=block; CLI exit=1",
          },
          {
            label: "决策",
            detail:
              "比较数值前，检查阈值是否有限、测试集是否非空。退出状态必须与报告决策一致。",
          },
        ],
        caption:
          "经历一次真实支持事故后，你会添加哪条断言，又如何保留其响应记录的来源？ 图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
