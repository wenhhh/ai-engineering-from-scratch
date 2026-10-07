(function () {
  "use strict";
  const controls = [
    { key: "query", label: "查询", type: "text", value: "cache policy" },
    {
      key: "text",
      label: "记忆文本",
      type: "text",
      value: "cache policy expires quickly",
    },
    {
      key: "revision",
      label: "已存修订版",
      type: "range",
      value: 1,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "expected",
      label: "调用方预期修订版",
      type: "range",
      value: 1,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "namespace",
      label: "命名空间不同",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const tokens = (s) => s.toLowerCase().match(/[a-z0-9]+/g) || [];
    const embed = (s) => {
      const out = Array(32).fill(0);
      for (const word of tokens(s)) {
        let h = 2166136261;
        for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        out[(h >>> 0) % 32]++;
      }
      return out;
    };
    const a = embed(v.query),
      b = embed(v.text),
      dot = a.reduce((s, x, i) => s + x * b[i], 0),
      norm = Math.sqrt(
        a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0),
      ),
      cos = norm ? dot / norm : 0;
    const terms = new Set(tokens(v.query)),
      words = new Set(tokens(v.text)),
      lex = terms.size
        ? [...terms].filter((x) => words.has(x)).length / terms.size
        : 0,
      score = v.namespace ? 0 : 0.6 * lex + 0.4 * cos;
    return {
      summary:
        v.expected === v.revision
          ? "写入可追加修订版 " + (v.revision + 1)
          : "追加前拒绝过期写入",
      metrics: [
        { label: "词汇覆盖率", value: lex.toFixed(3) },
        { label: "特征哈希的余弦相似度", value: cos.toFixed(3) },
        { label: "返回分数", value: score.toFixed(3) },
      ],
      bars: [
        {
          label: "词汇部分贡献",
          value: v.namespace ? 0 : 0.6 * lex,
          max: 1,
        },
        {
          label: "余弦部分贡献",
          value: v.namespace ? 0 : 0.4 * cos,
          max: 1,
        },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-memory-server-1",
    Object.assign(
      {
        title: "同时保留文本、命名空间与来源",
        steps: [
          { label: "输入契约", detail: "validateMemory, embed" },
          {
            label: "同时保留文本、命名空间与来源",
            detail:
              "每条记忆都需要有长度边界的 id、命名空间、文本和来源定位信息。不要返回与来源脱离的孤立字符串。小型特征哈希嵌入将规范化词项映射到固定向量，是确定性的词汇投影，不是预训练语义模型。哈希碰撞在预期之中，因此检索仍需保留词汇证据。",
          },
          {
            label: "观察结果",
            detail:
              "向量包含 32 个桶，每条记录同时保留可阅读的来源定位信息。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-2",
    Object.assign(
      {
        title: "串行执行带修订版的写入",
        steps: [
          {
            label: "输入契约",
            detail: "MemoryStore.put, MemoryStore.list",
          },
          {
            label: "串行执行带修订版的写入",
            detail:
              "加载带版本的事件日志，为每个 namespace/id 组合重建最新记录。更新必须声明预期修订版。将写入串行化，防止两个调用方同时从修订版零开始竞争，却都成功。先追加日志，再修改内存映射。这是单进程存储：追加完成不保证断电持久性；多个服务器进程需要外部锁或数据库。",
          },
          {
            label: "观察结果",
            detail:
              "两个并发创建返回一次成功和一次修订冲突；重新打开存储可恢复成功记录。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-3",
    Object.assign(
      {
        title: "在实际 Rust 进程中计算向量分数",
        steps: [
          {
            label: "输入契约",
            detail: "cosineScores, MemoryStore.search",
          },
          {
            label: "在实际 Rust 进程中计算向量分数",
            detail:
              "使用标准 Rust 工具链编译 score.rs，经 stdin 传送查询和文档向量。计算余弦相似度，零范数向量返回零。将 60% 的词汇查询覆盖率与 40% 的余弦分数组合，分数相同时用 id 决定顺序。跨越进程边界前检查维度及有限数值。Rust 二进制编译到私有临时目录。",
          },
          {
            label: "观察结果",
            detail:
              "Rust 内核对相同向量给出 1.0；搜索返回匹配记忆，并完整保留来源。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-4",
    Object.assign(
      {
        title: "提供 REST 与 MCP 工具",
        steps: [
          { label: "输入契约", detail: "createMemoryServer" },
          {
            label: "提供 REST 与 MCP 工具",
            detail:
              "绑定本地服务器，要求持有者令牌，限制请求体，并通过 JSON-RPC POST 实现健康检查、REST 写入／搜索，以及 MCP 初始化／工具子集。工具执行失败在成功的 JSON-RPC 响应中使用 isError；未知协议方法使用 JSON-RPC 错误。这是教学子集，不提供会话、流式传输或生产级认证。通过实际 HTTP 字节测试，防止序列化丢失来源或修订版。",
          },
          {
            label: "观察结果",
            detail:
              "演示通过回环地址执行实际 REST 写入和 MCP 搜索，再打印来源、修订版与分数。",
          },
        ],
        caption: "继续前进，在下一次副作用发生前检查边界。 图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
