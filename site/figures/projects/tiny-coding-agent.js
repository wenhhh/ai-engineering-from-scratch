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
        "file",
        "工作区文件文本",
        "def total(price, quantity): return price + quantity",
      ),
      text("old", "精确的旧表达式", "price + quantity"),
      text("replacement", "候选替换内容", "price * quantity"),
      text("failure", "观察到的测试输出", "AssertionError: 10 != 21"),
      text("marker", "提案的失败标记", "AssertionError"),
      number("used", "已用动作数", 1, 0, 6),
      number("budget", "动作预算", 4, 1, 6),
      number("price", "测试单价", 7, 0, 20),
      number("quantity", "测试数量", 3, 0, 10),
    ],
    calculate(v) {
      const count = v.old ? v.file.split(v.old).length - 1 : 0,
        observed = v.failure.includes(v.marker) && !!v.marker,
        allowed = count === 1 && observed && v.used < v.budget;
      const before = v.price + v.quantity,
        expected = v.price * v.quantity;
      const multiply = v.replacement === "price * quantity";
      return {
        summary:
          v.used >= v.budget
            ? "budget_exhausted"
            : !observed
              ? "规划器放弃：缺少标记"
              : count !== 1
                ? "补丁前置条件失败：" + count + " 处匹配"
                : allowed
                  ? "应用精确提案，再运行真实测试"
                  : "rejected",
        metrics: [
          metric("精确匹配次数", count),
          metric("观察到的失败匹配", observed),
          metric("预期测试值", expected),
          metric(
            "预测的提案值",
            multiply ? expected : "未解释",
          ),
        ],
        bars: [
          bar("错误的加法输出", before),
          bar("预期乘积", expected),
        ],
        columns: ["观察", "状态"],
        rows: [
          [
            "修改前测试",
            before === expected ? "夹具偶然通过" : "failure",
          ],
          ["补丁", allowed ? "eligible" : "blocked"],
          ["修改后测试", "必须执行；预测不是证明"],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-1",
    Object.assign(
      {
        title: "将文件工具限制在工作区内",
        steps: [
          {
            label: "相对路径",
            detail:
              "Orchard 购物篮修复在可信 Python 工作区的可丢弃副本中运行。打开文件前，将每个请求路径解析到该根目录之下。路径看起来位于本地，符号链接却可能将其重定向到工作区之外。",
          },
          {
            label: "解析",
            detail:
              "basket.py -> contained existing file\n../basket.py -> reject\nsymlink to external file -> reject",
          },
          {
            label: "范围限制",
            detail:
              "比较解析后的路径组件，不要比较字符串前缀。工作区由调用方选择，模型响应不能选择新根目录。",
          },
        ],
        caption:
          "复制可信仓库为什么不能让其中测试自动成为沙箱内代码？ 图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-2",
    Object.assign(
      {
        title: "按前置条件应用精确补丁",
        steps: [
          {
            label: "前置条件",
            detail:
              "补丁明确声明要替换的内容。出错的购物篮函数没有将单价乘以数量，而是返回 price + quantity。仅当该表达式出现一次时才替换。",
          },
          {
            label: "替换",
            detail:
              "old: price + quantity\nnew: price * quantity\noccurrences=1 -> write; occurrences=0 or 2 -> reject",
          },
          {
            label: "原子写入",
            detail:
              "打开临时输出文件前统计精确匹配次数。替换原文件时保留权限。",
          },
        ],
        caption:
          "规划器提出补丁后，另一位编辑者先修好了文件，此时应该怎样处理？ 图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-3",
    Object.assign(
      {
        title: "通过唯一允许的命令运行真实测试",
        steps: [
          {
            label: "参数数组",
            detail:
              "声明修复成功前，运行真实 unittest 测试。原始购物篮示例的 total(7,3) 返回 10 而非 21，total(7,0) 返回 7 而非 0。应用补丁后，这两个失败都应消失。",
          },
          {
            label: "超时",
            detail:
              "before: 2 failed assertions\nafter: 2 executed tests, OK\nzero tests or skipped tests -> not success",
          },
          {
            label: "证据",
            detail:
              "从 stderr 读取最终 unittest 摘要，要求实际测试数量大于零。在 POSIX 上，测试期限到达时停止整个进程组。",
          },
        ],
        caption:
          '为什么打印的“Ran 999 tests”不能被当作测试证据？ 图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。',
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-tiny-coding-agent-4",
    Object.assign(
      {
        title: "根据证据或预算停止编程循环",
        steps: [
          {
            label: "动作",
            detail:
              "规划器现在接收每次观察结果。先运行测试，只在失败标记出现时选择随附精确修复，再运行测试。这个透明的规则规划器不声称通过模型创造代码。",
          },
          {
            label: "观察",
            detail:
              "test -> AssertionError\nproposal marker matches -> patch\ntest -> OK -> completed",
          },
          {
            label: "停止",
            detail:
              "每次工具返回结果后重新调用规划器。保留每次请求的动作及其观察；规划器放弃或步数耗尽时停止。",
          },
        ],
        caption:
          "如何接入模型，同时保留相同的补丁前置条件和完成规则？ 图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
