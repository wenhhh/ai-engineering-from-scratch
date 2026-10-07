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
      text("name", "技能名称", "orchard-release"),
      text("description", "描述", "Review deployment evidence"),
      text("file", "资源路径", "references/checklist.md"),
      select("agent", "目标智能体", "codex", ["codex", "claude", "cursor"]),
      text("installed", "已安装文件文本", "Check replicas"),
      text("current", "当前本地文件文本", "Check replicas"),
      text("incoming", "待升级文件文本", "Check replicas and restore"),
      check("digestMatches", "可信来源摘要匹配", true),
    ],
    calculate(v) {
      const valid =
        /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(v.name) &&
        !v.name.includes("--") &&
        !!v.description.trim() &&
        [...v.description].length <= 1024;
      const safe =
        !!v.file &&
        !v.file.startsWith("/") &&
        !v.file.includes("\\") &&
        !v.file.split("/").some((x) => !x || x === "." || x === "..") &&
        !/^[A-Za-z]:/.test(v.file);
      const conflict = v.installed !== v.current;
      const destination =
        {
          codex: ".agents/skills",
          claude: ".claude/skills",
          cursor: ".cursor/skills",
        }[v.agent] +
        "/" +
        v.name;
      return {
        summary:
          !valid || !safe
            ? "技能包已拒绝"
            : !v.digestMatches
              ? "完整性不匹配"
              : conflict
                ? "升级已阻止：保留本地修改"
                : stage === 2
                  ? "带引号的元数据兼容校验器"
                  : "技能包可暂存至 " + destination,
        metrics: [
          metric("元数据有效", valid),
          metric("路径在词法检查中受限", safe),
          metric("本地修改冲突", conflict),
        ],
        bars: [
          bar("当前字符数", [...v.current].length),
          bar("升级字符数", [...v.incoming].length),
        ],
        columns: ["字段", "值"],
        rows: [
          ["目标位置", destination],
          ["YAML 名称", "name: " + JSON.stringify(v.name)],
          ["YAML 描述", "description: " + JSON.stringify(v.description)],
          [
            "升级差异",
            v.current === v.incoming
              ? "unchanged"
              : v.current + " -> " + v.incoming,
          ],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-installer-1",
    Object.assign(
      {
        title: "校验可移植技能包",
        steps: [
          {
            label: "输入契约",
            detail:
              "可移植技能包包含元数据和相对路径下的 UTF-8 文件。将 SKILL.md 作为入口文档，拒绝任何可能越出所选安装根目录的资源名称。Orchard 原创技能包附带恢复检查清单。",
          },
          {
            label: "校验可移植技能包",
            detail:
              "name=orchard-release\nfiles: SKILL.md, references/checklist.md\n../settings.json -> rejected",
          },
          {
            label: "观察结果",
            detail:
              "创建目录前校验每个文件路径。将 .installed.json 保留给安装器凭据使用。",
          },
        ],
        caption:
          "即使当前机器使用斜杠路径，为什么仍须拒绝 Windows 反斜杠？ 图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-2",
    Object.assign(
      {
        title: "转换元数据并计算内容哈希",
        steps: [
          {
            label: "输入契约",
            detail:
              "将 name 和 description 序列化为与 JSON 兼容的双引号 YAML 标量。Rust 校验器接受相同子集，包括转义字符。由于转换会重写元数据，来源摘要与转换后摘要不同。",
          },
          {
            label: "转换元数据并计算内容哈希",
            detail:
              'source bundle digest -> expected source identity\ntranslated SKILL.md: name: "orchard-release"\ntranslated digest -> installed content identity',
          },
          {
            label: "观察结果",
            detail:
              "计算哈希前先排序文件条目。摘要只能将内容与可信预期进行比较；从不可信字节直接计算摘要，不能证明发布者身份。",
          },
        ],
        caption:
          "描述中含有引号时，安装器与校验器之间的往返应如何保留它？ 图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-3",
    Object.assign(
      {
        title: "在指定根目录内原子安装",
        steps: [
          {
            label: "输入契约",
            detail:
              "安装到调用方拥有、可丢弃的根目录。安装器先将每个文件写入私有的同级目录，技能包完整后才重命名至智能体的发现路径。",
          },
          {
            label: "在指定根目录内原子安装",
            detail:
              "root/.agents/skills/orchard-release/\nSKILL.md + references/checklist.md + .installed.json",
          },
          {
            label: "观察结果",
            detail:
              "暂存前检查父目录是否为符号链接。将智能体目录映射与可移植技能内容分开。",
          },
        ],
        caption:
          "重命名之前发生写入失败时，读取方应观察到什么？ 图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-installer-4",
    Object.assign(
      {
        title: "升级时保护本地修改",
        steps: [
          {
            label: "输入契约",
            detail:
              "升级必须保留本地修改。将当前文件与此前安装摘要比较，拒绝已修改或不受管理的文件。演示会编辑检查清单，再尝试安装，并保留该修改。",
          },
          {
            label: "升级时保护本地修改",
            detail:
              "installed checklist hash=A\nlocal edit -> current hash=B\nupgrade -> modified installation; local text remains",
          },
          {
            label: "观察结果",
            detail:
              "移动目标目录前，读取现有凭据并校验文件清单。如果最终重命名失败，恢复此前移走的备份。",
          },
        ],
        caption:
          "在替换经过本地编辑的检查清单前，可审阅的合并需要展示哪些信息？ 图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。",
      },
      { lab: buildLab(4) },
    ),
  );
})();
