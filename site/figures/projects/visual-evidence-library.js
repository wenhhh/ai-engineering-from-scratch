(function () {
  "use strict";
  const steps = [
    { label: "图片", detail: "使用原图像素，不使用屏幕像素。" },
    { label: "区域", detail: "保留文本及对应矩形。" },
    {
      label: "检查",
      detail: "结构检查不能验证文本本身。",
    },
  ];
  window.AIFSProjectFigures.register("pj-visual-evidence-library-1", {
    title: "矩形是否位于图片内？",
    steps,
    caption:
      "图片尺寸为 600×320 像素，矩形必须位于四条边界内。 图表限制：矩形控件模型未检查负的左上坐标；检索图使用 JavaScript 小写转换，实际 Python 实现使用 Unicode casefold。超出控件范围或涉及 ß 等字符时，两者结果可能不同。完整路径、类型及索引校验以实际实现为准。",
    lab: {
      controls: [
        {
          key: "x",
          label: "左侧 x",
          type: "range",
          value: 45,
          min: 0,
          max: 600,
        },
        {
          key: "y",
          label: "上方 y",
          type: "range",
          value: 130,
          min: 0,
          max: 320,
        },
        {
          key: "width",
          label: "区域宽度",
          type: "range",
          value: 510,
          min: 0,
          max: 600,
        },
        {
          key: "height",
          label: "区域高度",
          type: "range",
          value: 45,
          min: 0,
          max: 320,
        },
      ],
      calculate(v) {
        const right = v.x + v.width,
          bottom = v.y + v.height;
        const valid =
          v.width > 0 && v.height > 0 && right <= 600 && bottom <= 320;
        return {
          summary: valid
            ? "几何有效；给定文本仍需要信任来源或人工审阅。"
            : "拒绝该矩形，不裁切证据来迁就校验。",
          metrics: [
            { label: "右边缘", value: right },
            { label: "下边缘", value: bottom },
          ],
          bars: [
            { label: "水平范围", value: right, max: 600 },
            { label: "垂直范围", value: bottom, max: 320 },
          ],
        };
      },
    },
  });
  const terms = (s) =>
    new Set(s.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
  window.AIFSProjectFigures.register("pj-visual-evidence-library-2", {
    title: "计算词项查询覆盖率",
    steps,
    caption:
      "这是给定文本的词项重叠得分，不执行 OCR，也不估计答案置信度。 图表限制：矩形控件模型未检查负的左上坐标；检索图使用 JavaScript 小写转换，实际 Python 实现使用 Unicode casefold。超出控件范围或涉及 ß 等字符时，两者结果可能不同。完整路径、类型及索引校验以实际实现为准。",
    lab: {
      controls: [
        {
          key: "query",
          label: "查询",
          type: "text",
          value: "return dry seeds",
        },
        {
          key: "text",
          label: "区域文本",
          type: "text",
          value: "Return dry seeds in paper envelopes.",
        },
      ],
      calculate(v) {
        const wanted = terms(v.query),
          have = terms(v.text),
          matches = [...wanted].filter((t) => have.has(t));
        const score = wanted.size ? matches.length / wanted.size : 0;
        return {
          summary: wanted.size
            ? `此区域命中 ${matches.length} 个词项，查询共 ${wanted.size} 个唯一词项。`
            : "空查询没有匹配结果。",
          metrics: [
            { label: "查询覆盖率", value: (score * 100).toFixed(0) + "%" },
            { label: "匹配词项", value: matches.join(", ") || "none" },
          ],
          bars: [{ label: "覆盖率", value: score, max: 1 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-visual-evidence-library-3", {
    title: "区分候选提取与已接受证据",
    steps,
    caption:
      "分类标签不进入文本索引。人工审阅是明确的状态转移。",
    lab: {
      controls: [
        {
          key: "text",
          label: "候选文本",
          type: "text",
          value: "Return tools to the blue shelf.",
        },
        {
          key: "label",
          label: "分类标签",
          type: "text",
          value: "notice",
        },
        {
          key: "geometry",
          label: "坐标通过边界检查",
          type: "checkbox",
          value: true,
        },
        {
          key: "reviewed",
          label: "已人工检查图片与文本",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const valid = Boolean(v.text.trim()) && v.geometry;
        const indexed = valid && v.reviewed;
        let summary = "单独保存候选提取，等待审阅。";
        if (!valid) summary = "拒绝格式无效的提取结果。";
        else if (indexed)
          summary = "明确审阅后的区域可进入文本索引。";
        return {
          summary,
          metrics: [
            { label: "可索引区域数", value: indexed ? 1 : 0 },
            { label: "可索引分类标签数", value: 0 },
          ],
          rows: [
            ["文本", v.text],
            ["仅分类标签", v.label],
            ["来源", "model-proposed"],
          ],
          columns: ["输出类别", "值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-visual-evidence-library-4", {
    title: "页面缩放时保持叠加层对齐",
    steps,
    caption:
      "宽 600 像素的原图包含矩形 [45,130,510,45]。JSON 中的原图坐标保持不变。",
    lab: {
      controls: [
        {
          key: "display",
          label: "图片显示宽度",
          type: "range",
          value: 420,
          min: 180,
          max: 900,
        },
      ],
      calculate(v) {
        const scale = v.display / 600;
        return {
          summary:
            "显示像素位置随尺寸缩放，百分比保持稳定。",
          metrics: [
            { label: "缩放比例", value: scale.toFixed(2) },
            { label: "左侧位置", value: (45 * scale).toFixed(1) + " px" },
            { label: "矩形宽度", value: (510 * scale).toFixed(1) + " px" },
          ],
          rows: [
            ["left", "45 / 600", "7.5%"],
            ["top", "130 / 320", "40.625%"],
            ["width", "510 / 600", "85%"],
            ["height", "45 / 320", "14.0625%"],
          ],
          columns: ["样式", "原图比例", "CSS 百分比"],
        };
      },
    },
  });
})();
