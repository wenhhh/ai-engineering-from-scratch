(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-1", {
    title: "重试需要稳定且唯一的标识",
    steps: [
      {
        label: "校验字符",
        detail:
          "标识符必须以小写字母开头，后接小写字母、数字或连字符，最多 64 个字符。",
      },
      {
        label: "记录执行意图",
        detail:
          "有效新任务从 queued、版本 0、尝试次数 0 开始，尚无租约或输出。",
      },
      {
        label: "绑定输入",
        detail:
          "CLI 将标识符绑定到不可变文本。内容相同的重复入队可安全处理；文本变化会冲突。",
      },
    ],
    caption:
      "改变标识符与载荷的关系，计算是否允许创建或重复投递。",
    lab: {
      controls: [
        { key: "id", label: "任务标识符", type: "text", value: "report-1" },
        {
          key: "exists",
          label: "ID 已保存",
          type: "checkbox",
          value: false,
        },
        {
          key: "changed",
          label: "载荷已变化",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const valid = /^[a-z][a-z0-9-]{0,63}$/.test(v.id);
        const conflict = valid && v.exists && v.changed;
        let summary = "创建 queued、版本 0 的记录；尚未执行副作用";
        if (!valid) summary = "已拒绝：标识符无效";
        else if (conflict)
          summary = "已拒绝：该标识符已绑定其他文本";
        else if (v.exists)
          summary = "相同内容再次投递：保留已有任务";
        return {
          summary: summary,
          metrics: [
            { label: "标识符长度", value: v.id.length },
            { label: "新增任务数", value: valid && !v.exists ? 1 : 0 },
            { label: "已执行的副作用数", value: 0 },
          ],
          bars: [{ label: "ID 长度 /64", value: v.id.length, max: 64 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-2", {
    title: "修改账本前先检查执行资格",
    steps: [
      {
        label: "比较版本",
        detail:
          "调用方的预期版本必须等于 queued 记录的当前版本。",
      },
      {
        label: "检查尝试上限",
        detail:
          "恢复保留尝试计数；queued 任务也可能已经耗尽重试额度。",
      },
      {
        label: "持久化领取记录",
        detail:
          "转换成功时递增版本和尝试次数，设置到期时间，再于持有账本锁时保存。",
      },
    ],
    caption:
      "租约区间左闭右开：到期时间就是开始拒绝完成提交的首个毫秒。",
    lab: {
      controls: [
        {
          key: "current",
          label: "当前版本",
          type: "number",
          value: 2,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "expected",
          label: "预期版本",
          type: "number",
          value: 2,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "attempts",
          label: "已有尝试次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
        {
          key: "cap",
          label: "尝试上限",
          type: "range",
          value: 3,
          min: 1,
          max: 5,
          step: 1,
        },
        {
          key: "now",
          label: "领取时间（ms）",
          type: "number",
          value: 100,
          min: 0,
          max: 1000,
          step: 1,
        },
        {
          key: "ttl",
          label: "租约时长（ms）",
          type: "range",
          value: 10,
          min: 1,
          max: 100,
          step: 1,
        },
      ],
      calculate(v) {
        const accepted = v.current === v.expected && v.attempts < v.cap;
        let summary = "领取已接受；先持久化，再执行";
        if (v.current !== v.expected)
          summary = "冲突：预期版本已过期";
        else if (!accepted)
          summary = "达到尝试上限；保留 queued 记录";
        return {
          summary: summary,
          metrics: [
            {
              label: "结果版本",
              value: v.current + (accepted ? 1 : 0),
            },
            {
              label: "结果尝试次数",
              value: v.attempts + (accepted ? 1 : 0),
            },
            { label: "租约到期时间", value: accepted ? v.now + v.ttl : 0 },
          ],
          bars: [
            {
              label: "已用尝试次数",
              value: v.attempts + (accepted ? 1 : 0),
              max: v.cap,
            },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-3", {
    title: "分别通过时间和版本限制工作进程",
    steps: [
      {
        label: "尝试提交完成",
        detail:
          "running 工作进程既须提交当前版本，也须严格早于租约到期时间。",
      },
      {
        label: "回收",
        detail:
          "到期时，running v1 转为 queued v2，在下一次领取前先使旧工作进程失效。",
      },
      {
        label: "重试",
        detail:
          "新工作进程领取 v3。即使旧 v1 报告更早的时钟，也无法提交完成。",
      },
    ],
    caption:
      "将时钟移至 110，并切换提交版本，观察两项独立检查。",
    lab: {
      controls: [
        {
          key: "now",
          label: "完成时间（ms）",
          type: "range",
          value: 109,
          min: 95,
          max: 125,
          step: 1,
        },
        {
          key: "version",
          label: "提交的版本",
          type: "number",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
        {
          key: "retry",
          label: "接替进程已领取 v3",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const current = v.retry ? 3 : 1,
          expiry = v.retry ? 120 : 110,
          accepted = v.version === current && v.now < expiry;
        let summary = "已接受完成提交";
        if (v.version !== current) summary = "已拒绝：版本过期";
        else if (!accepted) summary = "已拒绝：租约过期";
        return {
          summary: summary,
          metrics: [
            { label: "当前领取版本", value: current },
            { label: "租约到期时间", value: expiry },
            { label: "剩余时间（ms）", value: Math.max(0, expiry - v.now) },
          ],
          bars: [
            { label: "完成时间", value: v.now, max: 125 },
            { label: "到期时间", value: expiry, max: 125 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-4", {
    title: "恢复写出结果与标记完成之间的间隙",
    steps: [
      {
        label: "持久化 v1",
        detail:
          "执行本地文本凭据操作前，保存 running 领取记录。",
      },
      {
        label: "发布执行结果",
        detail:
          "同步临时凭据后通过硬链接发布，不覆盖已有输出。",
      },
      {
        label: "崩溃与重试",
        detail:
          "租约到期后恢复至 v3，复用已有的相同凭据，并持久化 completed v4。",
      },
    ],
    caption:
      "计算单个任务的进程崩溃时间线，不模拟文件系统断电。",
    lab: {
      controls: [
        {
          key: "point",
          label: "崩溃点",
          type: "select",
          value: "effect",
          options: [
            { value: "claim", label: "领取之后" },
            { value: "effect", label: "执行结果产生之后" },
          ],
        },
        {
          key: "recover",
          label: "恢复时钟（ms）",
          type: "range",
          value: 111,
          min: 100,
          max: 125,
          step: 1,
        },
      ],
      calculate(v) {
        const effect = v.point === "effect",
          expired = v.recover >= 110;
        let summary = "租约仍由原进程持有：接替进程不能执行";
        if (expired && effect)
          summary = "回收、复用已有执行结果，完成 v4";
        else if (expired)
          summary = "回收、首次发布执行结果，完成 v4";
        return {
          summary: summary,
          metrics: [
            { label: "重启前的执行结果数", value: effect ? 1 : 0 },
            {
              label: "重启后新增的执行结果数",
              value: expired && !effect ? 1 : 0,
            },
            { label: "已完成任务数", value: expired ? 1 : 0 },
          ],
          columns: ["时刻", "版本", "执行结果"],
          rows: [
            ["claim at 100", 1, 0],
            ["crash", 1, effect ? 1 : 0],
            [
              "restart at " + v.recover,
              expired ? 4 : 1,
              expired || effect ? 1 : 0,
            ],
          ],
          bars: [
            {
              label: "已持久化的执行结果数",
              value: expired || effect ? 1 : 0,
              max: 1,
            },
          ],
        };
      },
    },
  });
})();
