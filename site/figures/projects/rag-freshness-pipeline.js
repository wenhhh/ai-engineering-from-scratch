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
      text("before", "原策略", "tokens expire after 60 minutes"),
      text("after", "传入策略", "tokens expire after 15 minutes"),
      check("present", "文档存在于传入语料", true),
      number("oldTime", "原时间戳", 100, 0, 500),
      number("updated", "传入时间戳", 200, 0, 500),
      number("now", "查询时间", 210, 0, 600),
      number("maxAge", "最大年龄", 60, 0, 300),
      number("expected", "预期版本", 1, 0, 5),
      number("current", "当前版本", 1, 0, 5),
    ],
    calculate(v) {
      const normal = (s) => s.normalize("NFC").replace(/\r\n/g, "\n").trim();
      const operation = !v.present
        ? "delete"
        : normal(v.before) !== normal(v.after)
          ? "update"
          : v.updated !== v.oldTime
            ? "refresh"
            : "unchanged";
      const age = v.now - v.updated,
        eligible = v.present && age >= 0 && age <= v.maxAge,
        commit = v.current === v.expected;
      return {
        summary:
          stage === 3
            ? commit
              ? "版本匹配：下一快照 " + (v.current + 1)
              : "旧版写入者：保留版本 " + v.current
            : stage === 4
              ? eligible
                ? "当前来源符合条件"
                : "查询时排除该来源"
              : "计划操作：" + operation,
        metrics: [
          metric("操作", operation),
          metric("年龄", age),
          metric("允许引用", eligible),
          metric("CAS 已接受", commit),
        ],
        bars: [
          bar("来源年龄", Math.max(0, age), v.maxAge),
          bar("允许年龄", v.maxAge),
        ],
        columns: ["字段", "之前", "之后"],
        rows: [
          [
            "规范化文本",
            normal(v.before),
            v.present ? normal(v.after) : "(deleted)",
          ],
          ["时间戳", v.oldTime, v.updated],
          ["快照版本", v.current, commit ? v.current + 1 : v.current],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-1",
    Object.assign(
      {
        title: "规范化文档并生成内容指纹",
        steps: [
          {
            label: "输入",
            detail:
              "Orchard 策略的超时值发生变化时，文档 ID 保持不变。对正文计算哈希前，先规范化 Unicode 和换行，并单独保存更新时间。内容未变但观察时间较晚时，只刷新元数据，无须重写内容。",
          },
          {
            label: "转换",
            detail:
              "id=orchard-auth\ntext: tokens expire after 60 minutes\nupdated: 100 -> 200\ncontent hash: unchanged",
          },
          {
            label: "验证",
            detail:
              "对规范化后的 UTF-8 字节计算哈希，不将时间戳混入内容标识。",
          },
        ],
        caption:
          "为什么采用两种不同编码形式的 café 应得到相同内容指纹？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-2",
    Object.assign(
      {
        title: "规划插入、更新、删除与刷新",
        steps: [
          {
            label: "输入",
            detail:
              "导入接收完整语料快照。after 夹具替换已停用的备份说明，并修改令牌有效期。必须删除新快照中缺失的 ID，避免过时证据继续被检索到。",
          },
          {
            label: "转换",
            detail:
              "before ids: orchard-auth, retired-backup\nafter ids: orchard-auth, restore-runbook\nupdate: orchard-auth; delete: retired-backup; insert: restore-runbook",
          },
          {
            label: "验证",
            detail:
              "决定任何操作前，先构建传入数据的 ID 映射。重复 ID 应报错，不能采用后写覆盖前写的处理方式。",
          },
        ],
        caption:
          "导入器若只接收部分变更流，契约需要怎样调整？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-3",
    Object.assign(
      {
        title: "使用原子替换持久化索引",
        steps: [
          {
            label: "输入",
            detail:
              "两个导入进程可能同时读到版本 1。同目录的持久锁文件将版本检查与替换写入串行化。对于 expected_version=1，只有一个进程能够提交；下一个写入者必须重新读取。",
          },
          {
            label: "转换",
            detail:
              "writer A expects 1 -> commits version 2\nwriter B expects 1 -> stale index version\nindex.json.lock remains as the stable lock inode",
          },
          {
            label: "验证",
            detail:
              "在 POSIX 中，读取、比较、fsync 和重命名期间始终持有 flock。释放锁后也不要删除锁文件，否则等待中的进程可能锁定不同文件。",
          },
        ],
        caption:
          "进程写完临时文件后、重命名之前退出，会发生什么？ 图表范围：控件只模拟单文档变化、版本条件与年龄判断，不执行文件锁、fsync、原子替换或真实进程竞争。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-4",
    Object.assign(
      {
        title: "查询时排除过期证据",
        steps: [
          {
            label: "输入",
            detail:
              "修改后，查询必须返回 15 分钟策略，不能再返回已停用的 60 分钟正文。即使最近一次快照后没有执行导入任务，回答时仍须检查时效性。",
          },
          {
            label: "转换",
            detail:
              "updated=200; now=210; max_age=60 -> age 10, eligible\nupdated=200; now=500; max_age=60 -> age 300, excluded",
          },
          {
            label: "验证",
            detail:
              "一次查询读取一个已提交快照。为每个命中项返回快照版本与来源哈希，使调用方能够发现过期引用。",
          },
        ],
        caption:
          "时间位于未来的文档，是否应该获得负年龄并成为最佳结果？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
