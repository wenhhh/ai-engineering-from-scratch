(function () {
  "use strict";
  var LF = window.LF;
  if (!LF) {
    return;
  }

  var el = LF.el,
    svgEl = LF.svgEl;
  var INK = "var(--ink,#1a1a1a)",
    SOFT = "var(--ink-soft,#555)",
    MUTE = "var(--ink-mute,#777)";
  var BP = "var(--blueprint,#3553ff)",
    BG = "var(--bg,#fafaf5)",
    SURF = "var(--bg-surface,#eee)";
  var RULE = "var(--rule-soft,#ddd)",
    WARN = "var(--warn,#b8870f)",
    BAD = "#d4493f";

  function pilotLab(label) {
    var n = function (key, label, value, min, max, step) {
      return {
        key: key,
        label: label,
        type: "range",
        value: value,
        min: min,
        max: max,
        step: step || 1,
      };
    };
    var t = function (key, label, value) {
      return { key: key, label: label, type: "text", value: value };
    };
    var c = function (key, label, value) {
      return { key: key, label: label, type: "checkbox", value: value };
    };
    var m = function (label, value) {
      return { label: label, value: value };
    };
    var b = function (label, value, max) {
      return { label: label, value: value, max: max };
    };
    if (label === "BM25 RANKING")
      return {
        controls: [
          n("N", "语料文档数", 12, 1, 30),
          n("df", "包含该词的文档数", 3, 1, 30),
          n("tf", "词语出现次数", 2, 0, 12),
          n("length", "文档长度", 80, 1, 300),
          n("average", "平均文档长度", 100, 1, 300),
          n("k1", "词频饱和参数 k1", 1.5, 0.1, 3, 0.1),
          n("b", "长度修正参数 b", 0.75, 0, 1, 0.05),
        ],
        calculate: function (v) {
          if (v.df > v.N)
            throw Error("Document frequency cannot exceed corpus size");
          var idf = Math.log(1 + (v.N - v.df + 0.5) / (v.df + 0.5));
          var contribution = function (tf) {
            return (
              (idf * tf * (v.k1 + 1)) /
              (tf + v.k1 * (1 - v.b + (v.b * v.length) / v.average))
            );
          };
          return {
            summary:
              "根据词频、稀有程度与长度计算 BM25 贡献。",
            metrics: [
              m("IDF", idf.toFixed(4)),
              m("分数", contribution(v.tf).toFixed(4)),
            ],
            bars: [
              b("tf=" + v.tf, contribution(v.tf)),
              b("词频加倍", contribution(v.tf * 2)),
              b("词频三倍", contribution(v.tf * 3)),
            ],
          };
        },
      };
    if (label === "SNIPPETS WITH EXACT OFFSETS")
      return {
        controls: [
          t("source", "来源正文", "Old rule. New rule."),
          n("start", "起始字符偏移", 10, 0, 100),
          n("end", "结束字符偏移", 19, 0, 100),
          t("quote", "保存的引文", "New rule."),
        ],
        calculate: function (v) {
          var points = Array.from(v.source),
            slice = points.slice(v.start, v.end).join("");
          var valid =
            v.start <= v.end && v.end <= points.length && slice === v.quote;
          return {
            summary: valid
              ? "精确来源区间匹配"
              : "来源区间变化或偏移无效",
            metrics: [
              m("来源字符数", points.length),
              m("区间长度", Math.max(0, v.end - v.start)),
              m("精确匹配", valid),
            ],
            bars: [
              b("区间字符数", Math.max(0, v.end - v.start), points.length),
              b("来源字符数", points.length),
            ],
            columns: ["字段", "值"],
            rows: [
              ["切片", slice],
              ["保存的引文", v.quote],
            ],
          };
        },
      };
    if (label === "PLAN THE RESEARCH")
      return {
        controls: [
          t(
            "question",
            "研究问题",
            "How do Orchard guest tokens expire?",
          ),
          n("count", "最大方面数", 4, 1, 4),
          t(
            "reply",
            "可选规划器回答",
            '{"facets":[{"sub_question":"When do guest tokens expire?","keywords":["tokens","expire"]}]}',
          ),
          c("useModel", "使用提供的规划器回答", true),
        ],
        calculate: function (v) {
          var facets = [],
            source = "rules";
          if (v.useModel) {
            try {
              var data = JSON.parse(v.reply);
              if (!Array.isArray(data.facets) || !data.facets.length)
                throw Error("facets");
              facets = data.facets.slice(0, v.count).map(function (f) {
                if (
                  typeof f.sub_question !== "string" ||
                  !f.sub_question.trim() ||
                  !Array.isArray(f.keywords) ||
                  !f.keywords.every(function (x) {
                    return typeof x === "string";
                  })
                )
                  throw Error("shape");
                return [f.sub_question, f.keywords.join(", ")];
              });
              source = "model";
            } catch (e) {
              source = "rules-fallback";
            }
          }
          if (source !== "model")
            facets = [
              "Overview",
              "How it works",
              "Risks and limits",
              "When to use it",
            ]
              .slice(0, v.count)
              .map(function (f) {
                return [
                  f + ": " + v.question,
                  v.question
                    .toLowerCase()
                    .match(/[a-z0-9]+/g)
                    .join(", "),
                ];
              });
          return {
            summary: source + ": " + facets.length + " 个研究方面",
            metrics: [
              m("规划来源", source),
              m("方面数量", facets.length),
            ],
            bars: [b("研究方面", facets.length, 4)],
            columns: ["子问题", "查询关键词"],
            rows: facets,
          };
        },
      };
    if (label === "WRITE ONLY FROM EVIDENCE")
      return {
        controls: [
          t(
            "text",
            "候选报告文本",
            "Tokens expire after 15 minutes [S1].",
          ),
          t("ids", "可用片段 ID", "S1,S2"),
          n("maximum", "句子预算", 3, 1, 8),
        ],
        calculate: function (v) {
          var ids = v.ids.split(",").map(function (x) {
            return x.trim();
          });
          var sentences = v.text.split(/(?<=\.)\s+/).filter(Boolean);
          var rows = sentences.map(function (s) {
            var cites = Array.from(
              s.matchAll(/\[([A-Za-z][A-Za-z0-9_-]*)\]/g),
            ).map(function (x) {
              return x[1];
            });
            return [
              s,
              cites.join(", "),
              !cites.length
                ? "uncited"
                : cites.some(function (id) {
                      return !ids.includes(id);
                    })
                  ? "dangling"
                  : "valid citation structure",
            ];
          });
          var kept = rows
            .filter(function (x) {
              return x[2] === "valid citation structure";
            })
            .slice(0, v.maximum);
          return {
            summary:
              kept.length +
              " 个结构上具有引用的句子保留；支持关系仍需验证。",
            metrics: [
              m("输入句子数", rows.length),
              m("预算内保留数", kept.length),
            ],
            bars: [
              b("输入", rows.length),
              b("结构合格数", kept.length),
            ],
            columns: ["句子", "引用", "引用检查"],
            rows: rows,
          };
        },
      };
    if (label === "VERIFY EVERY CLAIM")
      return {
        controls: [
          t("source", "来源句子", "Tokens expire after 15 minutes."),
          t("claim", "草稿句子", "Tokens expire after 60 minutes."),
          n("used", "已用工作单元", 4, 0, 12),
          n("budget", "工作预算", 5, 1, 12),
        ],
        calculate: function (v) {
          var token = function (s) {
              return s.toLowerCase().match(/[a-z0-9]+/g) || [];
            },
            a = token(v.source),
            q = token(v.claim);
          var numbers = (v.claim.match(/\d+/g) || []).every(function (x) {
            return (v.source.match(/\d+/g) || []).includes(x);
          });
          var neg = function (w) {
            return ["no", "not", "never", "cannot"]
              .filter(function (x) {
                return w.includes(x);
              })
              .join();
          };
          var overlap = q.length
            ? q.filter(function (x) {
                return a.includes(x);
              }).length / q.length
            : 0;
          var reason =
            v.used >= v.budget
              ? "budget exhausted"
              : !numbers
                ? "number changed"
                : neg(a) !== neg(q)
                  ? "negation changed"
                  : overlap < 0.8
                    ? "insufficient lexical overlap"
                    : "lexical match";
          return {
            summary: reason + "；来源真实性不属于本项检查。",
            metrics: [
              m("重叠率", overlap.toFixed(3)),
              m("数字一致", numbers),
              m("剩余工作预算", Math.max(0, v.budget - v.used)),
            ],
            bars: [
              b("词汇重叠", overlap, 1),
              b("已用工作量", v.used, v.budget),
            ],
          };
        },
      };
    if (label === "PUBLISH THE REPORT")
      return {
        controls: [
          t("source", "文档来源", "Tokens expire after 15 minutes."),
          t("snippet", "片段文本", "Tokens expire after 15 minutes."),
          t("title", "报告标题", "Orchard <policy> audit"),
          n("version", "载荷模式版本", 1, 0, 3),
        ],
        calculate: function (v) {
          var escaped = v.title
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
          var valid = v.version === 1 && v.source === v.snippet;
          return {
            summary: valid
              ? "版本与精确证据满足渲染要求"
              : "发布前拒绝该载荷",
            metrics: [
              m("支持该模式", v.version === 1),
              m("来源匹配", v.source === v.snippet),
            ],
            bars: [
              b("来源字符数", Array.from(v.source).length),
              b("片段字符数", Array.from(v.snippet).length),
            ],
            columns: ["边界", "序列化值"],
            rows: [
              ["HTML 文本", escaped],
              ["证据", v.snippet],
              ["发布", valid ? "eligible" : "blocked"],
            ],
          };
        },
      };
    if (label === "SCORE THE PUBLIC FIXTURES")
      return {
        controls: [
          n("claims", "论断数", 10, 0, 20),
          n("supported", "受支持论断数", 8, 0, 20),
          n("expected", "预期来源数", 4, 0, 10),
          n("found", "已找到的受支持预期来源", 3, 0, 10),
          n("facts", "已标注事实数", 6, 0, 12),
          n("covered", "已覆盖的受支持事实", 4, 0, 12),
        ],
        calculate: function (v) {
          if (
            v.supported > v.claims ||
            v.found > v.expected ||
            v.covered > v.facts
          )
            throw Error("A numerator cannot exceed its denominator");
          var precision = v.claims ? v.supported / v.claims : 0,
            recall = v.expected ? v.found / v.expected : null,
            coverage = v.facts ? v.covered / v.facts : null;
          var denominator =
            0.5 + (recall === null ? 0 : 0.25) + (coverage === null ? 0 : 0.25);
          var score = v.claims
            ? (100 *
                (0.5 * precision +
                  0.25 * (recall || 0) +
                  0.25 * (coverage || 0))) /
              denominator
            : 0;
          return {
            summary:
              "计算出的样例得分 " +
              score.toFixed(2) +
              "；公开夹具不衡量未见数据泛化。",
            metrics: [
              m("精确率", precision.toFixed(3)),
              m("召回率", recall === null ? "unavailable" : recall.toFixed(3)),
              m(
                "覆盖率",
                coverage === null ? "unavailable" : coverage.toFixed(3),
              ),
            ],
            bars: [
              b("精确率", precision, 1),
              b("召回率", recall || 0, 1),
              b("覆盖率", coverage || 0, 1),
            ],
          };
        },
      };
    return {
      controls: [
        n("documents", "语料文档数", 12, 0, 40),
        n("facets", "研究方面数", 4, 1, 6),
        n("perFacet", "每方面片段数", 3, 0, 6),
        n("sentenceLimit", "每章节句子数", 3, 1, 6),
        n("budget", "工作预算", 5, 0, 8),
      ],
      calculate: function (v) {
        var snippets = v.documents
          ? Math.min(v.documents, v.perFacet) * v.facets
          : 0;
        var sentences = Math.min(snippets, v.sentenceLimit * v.facets);
        return {
          summary:
            v.budget < 5
              ? "预算使五步流水线停止"
              : !sentences
                ? "没有可供报告使用的证据"
                : "有界流水线可以收集并验证证据",
          metrics: [
            m("候选片段数", snippets),
            m("最大句子数", sentences),
            m("必需步骤数", 5),
          ],
          bars: [
            b("已收集候选", snippets),
            b("句子上限", sentences),
            b("工作预算", v.budget, 5),
          ],
        };
      },
    };
  }

  function anim(attr, vals, dur, extra) {
    var a = {
      attributeName: attr,
      values: vals,
      dur: dur,
      repeatCount: "indefinite",
    };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl("animate", a);
  }
  function animT(type, vals, dur, extra) {
    var a = {
      attributeName: "transform",
      type: type,
      values: vals,
      dur: dur,
      repeatCount: "indefinite",
    };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl("animateTransform", a);
  }
  function card(host, label, hint, svg, caption) {
    host.setAttribute("data-static-time", "7.5");
    host.appendChild(
      el("div", { class: "lf" }, [
        el("div", { class: "lf-head" }, [
          el("span", { class: "lf-label" }, [label]),
          el("span", {}, [hint]),
        ]),
        el("div", { class: "lf-body" }, [
          el("div", { class: "lf-out" }, [svg]),
        ]),
        el("div", { class: "lf-cap" }, [caption]),
      ]),
    );
    window.AIFSProjectFigures.mountLab(
      host.querySelector(".lf-body"),
      pilotLab(label),
    );
  }
  function txt(x, y, s, fill, size, anchor, weight) {
    var a = {
      x: x,
      y: y,
      fill: fill || SOFT,
      "font-size": size || 11,
      "font-family": "var(--font-mono,monospace)",
      "text-anchor": anchor || "middle",
    };
    if (weight) a["font-weight"] = weight;
    return svgEl("text", a, [svgEl("tspan", {}, [document.createTextNode(s)])]);
  }
  function box(x, y, w, h, stroke, fill, dash) {
    var a = {
      x: x,
      y: y,
      width: w,
      height: h,
      rx: 4,
      fill: fill || BG,
      stroke: stroke || RULE,
      "stroke-width": "1.5",
    };
    if (dash) a["stroke-dasharray"] = dash;
    return svgEl("rect", a);
  }
  function group(children) {
    var g = svgEl("g", {});
    for (var i = 0; i < children.length; i++) g.appendChild(children[i]);
    return g;
  }
  function line(x1, y1, x2, y2, stroke, dash, width) {
    var a = {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      stroke: stroke || RULE,
      "stroke-width": width || "1.5",
    };
    if (dash) a["stroke-dasharray"] = dash;
    return svgEl("line", a);
  }
  function arrow(x1, y1, x2, y2, stroke) {
    var g = svgEl("g", {});
    g.appendChild(line(x1, y1, x2, y2, stroke || MUTE));
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var s = 5;
    var p1x = x2 - s * Math.cos(ang - 0.45),
      p1y = y2 - s * Math.sin(ang - 0.45);
    var p2x = x2 - s * Math.cos(ang + 0.45),
      p2y = y2 - s * Math.sin(ang + 0.45);
    g.appendChild(
      svgEl("polygon", {
        points:
          x2 +
          "," +
          y2 +
          " " +
          p1x.toFixed(1) +
          "," +
          p1y.toFixed(1) +
          " " +
          p2x.toFixed(1) +
          "," +
          p2y.toFixed(1),
        fill: stroke || MUTE,
      }),
    );
    return g;
  }
  function reveal(node, t0, t1, dur) {
    var a = Math.max(0.001, Math.min(t0, 0.97)),
      b = Math.min(t1, 0.999);
    node.setAttribute("opacity", "0");
    node.appendChild(
      anim("opacity", "0;0;1;1;0", dur, {
        keyTimes:
          "0;" +
          a.toFixed(3) +
          ";" +
          Math.min(a + 0.02, b).toFixed(3) +
          ";" +
          b.toFixed(3) +
          ";1",
      }),
    );
    return node;
  }

  function pipeline(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 300" });
    var lanes = [
      { y: 18, name: "RUST", why: "高效安全的索引", color: WARN },
      { y: 118, name: "PYTHON", why: "模型编排", color: BP },
      { y: 218, name: "TYPESCRIPT", why: "网页阅读器", color: INK },
    ];
    lanes.forEach(function (l) {
      svg.appendChild(box(6, l.y, 508, 76, RULE, SURF));
      svg.appendChild(txt(16, l.y + 32, l.name, l.color, 12, "start", "700"));
      svg.appendChild(txt(16, l.y + 50, l.why, MUTE, 9, "start"));
    });
    function stage(x, y, w, label, color) {
      svg.appendChild(box(x, y, w, 34, color || RULE, BG));
      svg.appendChild(txt(x + w / 2, y + 21, label, INK, 10));
    }
    stage(126, 39, 88, "corpus", WARN);
    stage(250, 39, 88, "BM25 索引", WARN);
    stage(374, 39, 118, "标准输出 JSON", WARN);
    svg.appendChild(arrow(214, 56, 248, 56));
    svg.appendChild(arrow(338, 56, 372, 56));
    var py = [
      ["plan", 126],
      ["snippets", 200],
      ["writer", 274],
      ["critic", 348],
      ["score", 422],
    ];
    py.forEach(function (p, i) {
      stage(p[1], 139, 66, p[0], BP);
      if (i) svg.appendChild(arrow(py[i - 1][1] + 66, 156, p[1] - 2, 156));
    });
    stage(126, 239, 100, "report.json", INK);
    stage(262, 239, 100, "render.ts", INK);
    stage(398, 239, 100, "report.html", INK);
    svg.appendChild(arrow(226, 256, 260, 256));
    svg.appendChild(arrow(362, 256, 396, 256));
    svg.appendChild(line(166, 118, 166, 94, BP, "3 3"));
    svg.appendChild(line(433, 94, 433, 118, WARN, "3 3"));
    svg.appendChild(line(381, 194, 381, 218, INK, "3 3"));

    var req = group([
      box(-34, -9, 68, 18, BP, BG),
      txt(0, 4, '{"q":…}', BP, 9),
    ]);
    req.appendChild(
      animT("translate", "166,150;166,150;166,106;294,106;294,106", D, {
        keyTimes: "0;0.08;0.2;0.3;1",
      }),
    );
    svg.appendChild(reveal(req, 0.06, 0.3, D));
    var res = group([
      box(-38, -9, 76, 18, WARN, BG),
      txt(0, 4, '{"hits":…}', WARN, 9),
    ]);
    res.appendChild(
      animT("translate", "433,56;433,56;433,106;233,106;233,150;233,150", D, {
        keyTimes: "0;0.32;0.42;0.52;0.6;1",
      }),
    );
    svg.appendChild(reveal(res, 0.32, 0.6, D));
    var rep = group([
      box(-34, -9, 68, 18, INK, BG),
      txt(0, 4, "report", INK, 9),
    ]);
    rep.appendChild(
      animT("translate", "381,156;381,156;381,206;176,206;176,256;176,256", D, {
        keyTimes: "0;0.64;0.72;0.82;0.9;1",
      }),
    );
    svg.appendChild(reveal(rep, 0.64, 0.92, D));
    svg.appendChild(txt(260, 111, "每个请求一行 JSON", MUTE, 9));
    card(
      host,
      "THREE LANGUAGES, ONE PIPELINE",
      "各部分采用适合的语言",
      svg,
      "Rust 实现检索引擎，高效处理字节与索引循环；Python 负责与模型交互，TypeScript 在浏览器中渲染报告。各部分只通过普通 JSON 相接，因此可独立测试和替换。",
    );
  }

  function bm25(host) {
    var D = "8s";
    var svg = svgEl("svg", { viewBox: "0 0 520 250" });
    svg.appendChild(txt(20, 24, "query", MUTE, 10, "start"));
    svg.appendChild(box(70, 10, 74, 22, BP, BG));
    svg.appendChild(txt(107, 25, "microvm", BP, 10));
    svg.appendChild(box(150, 10, 64, 22, BP, BG));
    svg.appendChild(txt(182, 25, "kernel", BP, 10));
    var docs = [
      { id: "doc-03", score: 0.55, final: 2 },
      { id: "doc-04", score: 0.95, final: 0 },
      { id: "doc-07", score: 0.25, final: 3 },
      { id: "doc-02", score: 0.72, final: 1 },
    ];
    docs.forEach(function (d, i) {
      var y0 = 52 + i * 40,
        yf = 52 + d.final * 40;
      var g = svgEl("g", {});
      g.appendChild(txt(20, 20, d.id, INK, 10, "start"));
      g.appendChild(box(78, 7, 190, 18, RULE, SURF));
      var bar = svgEl("rect", {
        x: 78,
        y: 7,
        width: 0,
        height: 18,
        rx: 3,
        fill: i === 1 ? BP : "var(--blueprint-tint-strong,rgba(53,83,255,.25))",
      });
      bar.appendChild(
        anim(
          "width",
          "0;0;" +
            (190 * d.score).toFixed(0) +
            ";" +
            (190 * d.score).toFixed(0) +
            ";0",
          D,
          { keyTimes: "0;0.05;0.35;0.95;1" },
        ),
      );
      g.appendChild(bar);
      var rank = txt(282, 20, "#" + (d.final + 1), MUTE, 10, "start");
      g.appendChild(reveal(rank, 0.62, 0.95, D));
      g.appendChild(
        animT(
          "translate",
          "0," + y0 + ";0," + y0 + ";0," + yf + ";0," + yf + ";0," + y0,
          D,
          { keyTimes: "0;0.4;0.55;0.95;1" },
        ),
      );
      svg.appendChild(g);
    });
    svg.appendChild(line(320, 12, 320, 238, RULE, "3 3"));
    svg.appendChild(txt(420, 30, "词频贡献逐渐饱和", SOFT, 10));
    var ox = 345,
      oy = 120,
      w = 150,
      h = 70;
    svg.appendChild(line(ox, oy, ox + w, oy, MUTE));
    svg.appendChild(line(ox, oy, ox, oy - h, MUTE));
    var d = "M" + ox + " " + oy;
    for (var i = 1; i <= 30; i++) {
      var tf = i / 3,
        s = (tf * 2.2) / (tf + 1.2);
      d +=
        " L" +
        (ox + (i / 30) * w).toFixed(1) +
        " " +
        (oy - (s / 2.2) * h).toFixed(1);
    }
    var curve = svgEl("path", {
      d: d,
      fill: "none",
      stroke: BP,
      "stroke-width": "2.2",
      "stroke-dasharray": "260",
      "stroke-dashoffset": "260",
    });
    curve.appendChild(
      anim("stroke-dashoffset", "260;0;0", D, { keyTimes: "0;0.4;1" }),
    );
    svg.appendChild(curve);
    svg.appendChild(txt(ox + w, oy + 14, "tf", MUTE, 9, "end"));
    svg.appendChild(txt(ox - 4, oy - h + 4, "score", MUTE, 9, "end"));
    svg.appendChild(txt(420, 160, "稀有词权重更高（IDF）", SOFT, 10));
    svg.appendChild(txt(350, 186, "kernel", INK, 10, "start"));
    svg.appendChild(box(410, 176, 90, 14, RULE, SURF));
    svg.appendChild(
      svgEl("rect", {
        x: 410,
        y: 176,
        width: 30,
        height: 14,
        rx: 3,
        fill: MUTE,
      }),
    );
    svg.appendChild(txt(350, 214, "microvm", INK, 10, "start"));
    svg.appendChild(box(410, 204, 90, 14, RULE, SURF));
    svg.appendChild(
      svgEl("rect", { x: 410, y: 204, width: 78, height: 14, rx: 3, fill: BP }),
    );
    card(
      host,
      "BM25 RANKING",
      "先评分，再排序",
      svg,
      "文档中每个命中的查询词都贡献分数。重复词的收益逐渐降低，出现在较少文档中的词比常见词权重更高。柱形图最终按检索引擎返回的排名排列。",
    );
  }

  function snippetOffsets(host) {
    var D = "8s";
    var svg = svgEl("svg", { viewBox: "0 0 520 220" });
    var sents = [
      { t: "Containers share the host kernel.", s: 0, e: 33 },
      { t: "A microVM boots its own guest kernel.", s: 34, e: 71 },
      { t: "Egress stays deny-by-default.", s: 72, e: 101 },
    ];
    svg.appendChild(txt(20, 22, "doc-04.md", MUTE, 10, "start"));
    sents.forEach(function (s, i) {
      var y = 36 + i * 32;
      svg.appendChild(box(20, y, 360, 24, RULE, SURF));
      svg.appendChild(txt(30, y + 16, s.t, INK, 11, "start"));
      svg.appendChild(
        txt(392, y + 16, "[" + s.s + ", " + s.e + ")", MUTE, 10, "start"),
      );
    });
    var win = svgEl("rect", {
      x: 17,
      y: 33,
      width: 366,
      height: 30,
      rx: 5,
      fill: "none",
      stroke: BP,
      "stroke-width": "2.5",
    });
    win.appendChild(
      animT("translate", "0,0;0,0;0,32;0,32;0,64;0,64;0,32;0,32", D, {
        keyTimes: "0;0.1;0.2;0.3;0.4;0.5;0.6;1",
      }),
    );
    svg.appendChild(win);
    var out = group([
      box(20, 146, 480, 58, BP, BG),
      txt(34, 166, "S3  doc-04  start=34  end=71", BP, 11, "start", "700"),
      txt(34, 190, "text == source[34:71]", INK, 11, "start"),
      txt(486, 190, "match", BP, 11, "end", "700"),
    ]);
    svg.appendChild(reveal(out, 0.62, 0.98, D));
    card(
      host,
      "SNIPPETS WITH EXACT OFFSETS",
      "来源区间验证",
      svg,
      "抽取器将文档拆成句子，保存每句在来源中的起止位置。只有按这些偏移切片能够得到精确原文时，片段才有效，使后续每条引用都可以用代码检查。",
    );
  }

  function planFacets(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 250" });
    svg.appendChild(box(110, 10, 300, 30, INK, SURF));
    svg.appendChild(txt(260, 30, "How should I isolate an AI agent?", INK, 11));
    svg.appendChild(box(20, 70, 70, 44, MUTE, SURF));
    svg.appendChild(
      svgEl("circle", {
        cx: 42,
        cy: 90,
        r: 9,
        fill: "none",
        stroke: MUTE,
        "stroke-width": "1.5",
      }),
    );
    svg.appendChild(
      svgEl("circle", {
        cx: 68,
        cy: 90,
        r: 9,
        fill: "none",
        stroke: MUTE,
        "stroke-width": "1.5",
      }),
    );
    svg.appendChild(txt(55, 128, "recorded", MUTE, 9));
    svg.appendChild(txt(55, 140, "replies", MUTE, 9));
    svg.appendChild(box(200, 66, 120, 50, BP, BG));
    svg.appendChild(txt(260, 88, "planner", BP, 12, "middle", "700"));
    svg.appendChild(txt(260, 104, "模型接口", MUTE, 9));
    svg.appendChild(arrow(260, 40, 260, 64));
    svg.appendChild(arrow(92, 92, 198, 92));
    var badReply = group([
      box(336, 64, 170, 26, BAD, BG),
      txt(421, 81, '"Sure! Here are…"', BAD, 10),
    ]);
    var strike = line(342, 77, 500, 77, BAD, null, "2");
    badReply.appendChild(strike);
    badReply.appendChild(txt(421, 102, "非 JSON：已拒绝", BAD, 9));
    svg.appendChild(reveal(badReply, 0.1, 0.38, D));
    var fallback = group([
      box(336, 70, 170, 34, BP, BG),
      txt(421, 91, "回退到规则", BP, 10),
    ]);
    svg.appendChild(reveal(fallback, 0.4, 0.99, D));
    var facets = ["what", "how", "risks", "tradeoffs"];
    facets.forEach(function (f, i) {
      var x = 40 + i * 118;
      var g = group([
        arrow(260, 118, x + 50, 176, MUTE),
        box(x, 178, 100, 34, BP, BG),
        txt(x + 50, 199, f, BP, 11),
      ]);
      svg.appendChild(reveal(g, 0.5 + i * 0.08, 0.99, D));
    });
    svg.appendChild(
      txt(260, 236, "每个研究方面形成一个报告章节", MUTE, 9),
    );
    card(
      host,
      "PLAN THE RESEARCH",
      "将问题拆成多个方面",
      svg,
      "规划器将问题拆成报告需要覆盖的几个角度。通过统一接口与模型交互，测试回放已记录回答，无需在线调用。回答不符合 JSON 格式时，计划回退到规则。",
    );
  }

  function citedWriter(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 250" });
    svg.appendChild(txt(20, 20, "evidence", MUTE, 10, "start"));
    var sn = [
      ["S1", "Containers share the host kernel."],
      ["S2", "A shim intercepts system calls."],
      ["S4", "Each microVM has its own kernel."],
    ];
    sn.forEach(function (s, i) {
      var y = 30 + i * 34;
      svg.appendChild(box(20, y, 150, 26, BP, BG));
      svg.appendChild(txt(28, y + 17, s[0], BP, 10, "start", "700"));
      svg.appendChild(
        txt(
          50,
          y + 17,
          s[1].length > 20 ? s[1].slice(0, 19) + "…" : s[1],
          SOFT,
          9,
          "start",
        ),
      );
    });
    svg.appendChild(txt(200, 20, "报告句子", MUTE, 10, "start"));
    var rows = [
      { t: "Containers share the host kernel [S1].", ok: true },
      { t: "Each microVM has its own kernel [S4].", ok: true },
      { t: "Sandboxes are always safe.", ok: false, why: "uncited" },
      { t: "A runtime uses VMs [S99].", ok: false, why: "dangling S99" },
    ];
    rows.forEach(function (r, i) {
      var y = 30 + i * 34;
      var g = group([
        box(200, y, 300, 26, r.ok ? RULE : BAD, SURF),
        txt(210, y + 17, r.t, r.ok ? INK : BAD, 10, "start"),
      ]);
      if (r.ok) g.appendChild(txt(492, y + 17, "ok", BP, 10, "end", "700"));
      svg.appendChild(reveal(g, 0.08 + i * 0.14, 0.99, D));
      if (!r.ok) {
        var bad = group([
          line(206, y + 13, 494, y + 13, BAD, null, "2"),
          txt(492, y + 40, r.why, BAD, 9, "end"),
        ]);
        svg.appendChild(reveal(bad, 0.2 + i * 0.14, 0.99, D));
      }
    });
    var dot = svgEl("circle", { r: 5, fill: BP });
    dot.appendChild(
      animT("translate", "170,43;200,43;170,111;200,77;170,43", D, {
        keyTimes: "0;0.12;0.2;0.3;1",
      }),
    );
    svg.appendChild(reveal(dot, 0.02, 0.32, D));
    svg.appendChild(txt(260, 180, "校验规则", MUTE, 10));
    svg.appendChild(
      txt(260, 200, "每句末尾都要有引用标记", SOFT, 10),
    );
    svg.appendChild(
      txt(260, 218, "每个标记都要对应真实片段", SOFT, 10),
    );
    card(
      host,
      "WRITE ONLY FROM EVIDENCE",
      "没有标记就不发布句子",
      svg,
      "写作器只能组织检索得到的片段，每句都携带片段 ID。独立校验器拒绝无标记句子及没有对应片段的标记，通过代码约束实现证据关联。",
    );
  }

  function critic(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 250" });
    svg.appendChild(txt(20, 20, "sentence", MUTE, 10, "start"));
    svg.appendChild(
      txt(330, 20, "与引用片段的重叠", MUTE, 10, "start"),
    );
    var rows = [
      { t: "Containers share the host kernel [S1].", v: 0.92, ok: true },
      {
        t: "A microVM has no guest kernel [S4].",
        v: 0.38,
        ok: false,
        why: "否定被翻转",
      },
      {
        t: "Boot takes 900 ms [S6].",
        v: 0.44,
        ok: false,
        why: "number changed",
      },
    ];
    rows.forEach(function (r, i) {
      var y = 30 + i * 44;
      svg.appendChild(box(20, y, 296, 28, r.ok ? RULE : RULE, SURF));
      svg.appendChild(txt(28, y + 18, r.t, INK, 9.5, "start"));
      svg.appendChild(box(330, y + 6, 120, 16, RULE, BG));
      var bar = svgEl("rect", {
        x: 330,
        y: y + 6,
        width: 0,
        height: 16,
        rx: 3,
        fill: r.ok ? BP : BAD,
      });
      bar.appendChild(
        anim(
          "width",
          "0;0;" + (120 * r.v).toFixed(0) + ";" + (120 * r.v).toFixed(0) + ";0",
          D,
          {
            keyTimes:
              "0;" +
              (0.05 + i * 0.12).toFixed(2) +
              ";" +
              (0.15 + i * 0.12).toFixed(2) +
              ";0.96;1",
          },
        ),
      );
      svg.appendChild(bar);
      var verdict = r.ok
        ? txt(460, y + 19, "kept", BP, 10, "start", "700")
        : txt(460, y + 19, "flagged", BAD, 10, "start", "700");
      svg.appendChild(reveal(verdict, 0.16 + i * 0.12, 0.99, D));
      if (!r.ok)
        svg.appendChild(
          reveal(
            txt(316, y + 40, r.why, BAD, 9, "end"),
            0.18 + i * 0.12,
            0.99,
            D,
          ),
        );
    });
    svg.appendChild(txt(20, 184, "运行预算", MUTE, 10, "start"));
    svg.appendChild(box(100, 173, 260, 16, RULE, BG));
    var budget = svgEl("rect", {
      x: 100,
      y: 173,
      width: 260,
      height: 16,
      rx: 3,
      fill: WARN,
    });
    budget.appendChild(
      anim("width", "260;260;110;110;260", D, {
        keyTimes: "0;0.05;0.6;0.97;1",
      }),
    );
    svg.appendChild(budget);
    svg.appendChild(txt(370, 185, "剩余步骤", MUTE, 9, "start"));
    var badge = group([
      box(100, 206, 260, 30, BP, BG),
      txt(230, 226, "completed · 2 sentences dropped", BP, 11, "middle", "700"),
    ]);
    svg.appendChild(reveal(badge, 0.62, 0.99, D));
    card(
      host,
      "VERIFY EVERY CLAIM",
      "评审器读取来源",
      svg,
      "评审器逐句对照引用片段，标记来源不支持的内容，例如否定翻转或数字变化。运行受预算约束，并以具名状态结束，避免静默停止。 图表勘误：评分控件使用 0.5／0.25／0.25 权重且缺少标注时返回不可用；本项目实际评分器采用 0.4／0.3／0.3，并将缺少来源或事实标注的项默认设为 1。静态评审图仍显示“completed · 2 sentences dropped”，与实际有删除项时的 needs_review 状态不符。这里只翻译说明，保留原计算与图例，并以运行测试为准。",
    );
  }

  function publish(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 260" });
    svg.appendChild(box(16, 30, 92, 40, INK, SURF));
    svg.appendChild(txt(62, 55, "report.json", INK, 10));
    svg.appendChild(arrow(108, 50, 136, 50));
    svg.appendChild(box(138, 30, 86, 40, INK, SURF));
    svg.appendChild(txt(181, 55, "render.ts", INK, 10));
    svg.appendChild(arrow(224, 50, 252, 50));
    svg.appendChild(box(254, 14, 250, 168, INK, BG));
    svg.appendChild(
      svgEl("rect", { x: 254, y: 14, width: 250, height: 16, fill: SURF }),
    );
    svg.appendChild(txt(266, 26, "report.html", MUTE, 9, "start"));
    svg.appendChild(txt(266, 50, "Isolating agents", INK, 12, "start", "700"));
    svg.appendChild(
      txt(266, 72, "Containers share the host", SOFT, 10, "start"),
    );
    svg.appendChild(txt(266, 86, "kernel.", SOFT, 10, "start"));
    svg.appendChild(txt(310, 86, "[1]", BP, 10, "start", "700"));
    svg.appendChild(
      txt(266, 104, "Each microVM has its own", SOFT, 10, "start"),
    );
    svg.appendChild(txt(266, 118, "kernel.", SOFT, 10, "start"));
    var m2 = txt(310, 118, "[2]", BP, 10, "start", "700");
    svg.appendChild(m2);
    var ring = svgEl("rect", {
      x: 306,
      y: 107,
      width: 22,
      height: 15,
      rx: 3,
      fill: "none",
      stroke: BP,
      "stroke-width": "1.5",
    });
    svg.appendChild(reveal(ring, 0.3, 0.8, D));
    var cursor = svgEl("polygon", {
      points: "0,0 0,13 4,10 7,16 9,15 6,9 11,9",
      fill: INK,
    });
    cursor.appendChild(
      animT("translate", "470,160;470,160;320,122;320,122;470,160", D, {
        keyTimes: "0;0.1;0.28;0.82;1",
      }),
    );
    var pop = group([
      box(270, 132, 222, 42, BP, SURF),
      txt(280, 149, '"Each microVM runs its own', INK, 9.5, "start"),
      txt(280, 164, 'guest kernel."  doc-04', INK, 9.5, "start"),
    ]);
    svg.appendChild(reveal(pop, 0.3, 0.8, D));
    svg.appendChild(cursor);
    svg.appendChild(txt(16, 210, "trace.json", MUTE, 10, "start"));
    var segs = [
      ["search", 60, WARN],
      ["plan", 50, BP],
      ["write", 90, BP],
      ["verify", 80, BP],
      ["publish", 60, INK],
    ];
    var x = 90;
    segs.forEach(function (s, i) {
      var r = svgEl("rect", {
        x: x,
        y: 200,
        width: s[1],
        height: 16,
        fill: s[2],
        opacity: "0.85",
      });
      svg.appendChild(reveal(r, 0.05 + i * 0.1, 0.99, D));
      svg.appendChild(txt(x + s[1] / 2, 234, s[0], MUTE, 9));
      x += s[1] + 2;
    });
    card(
      host,
      "PUBLISH THE REPORT",
      "脚注展示来源引文",
      svg,
      "TypeScript 将 report.json 转为页面，每个脚注标记都展示对应的精确来源句子。trace.json 在报告之外记录各步骤、耗时及终止情况，使读者能同时审计论断和过程。",
    );
  }

  function scorecard(host) {
    var D = "9s";
    var svg = svgEl("svg", { viewBox: "0 0 520 240" });
    svg.appendChild(txt(20, 20, "公开夹具", MUTE, 10, "start"));
    for (var i = 0; i < 6; i++) {
      var y = 30 + i * 26;
      svg.appendChild(box(20, y, 120, 20, RULE, SURF));
      svg.appendChild(txt(30, y + 14, "Q" + (i + 1), INK, 10, "start"));
      svg.appendChild(
        reveal(
          txt(128, y + 14, "run", BP, 9, "end", "700"),
          0.05 + i * 0.06,
          0.99,
          D,
        ),
      );
    }
    var gauges = [
      ["引用精确率", 1.0, "1.00"],
      ["来源召回率", 0.92, "0.92"],
      ["事实覆盖率", 0.67, "0.67"],
    ];
    gauges.forEach(function (g, i) {
      var y = 34 + i * 40;
      svg.appendChild(txt(170, y, g[0], SOFT, 10, "start"));
      svg.appendChild(box(170, y + 6, 240, 14, RULE, BG));
      var bar = svgEl("rect", {
        x: 170,
        y: y + 6,
        width: 0,
        height: 14,
        rx: 3,
        fill: BP,
      });
      bar.appendChild(
        anim(
          "width",
          "0;0;" +
            (240 * g[1]).toFixed(0) +
            ";" +
            (240 * g[1]).toFixed(0) +
            ";0",
          D,
          { keyTimes: "0;0.4;" + (0.5 + i * 0.05).toFixed(2) + ";0.96;1" },
        ),
      );
      svg.appendChild(bar);
      svg.appendChild(
        reveal(
          txt(420, y + 18, g[2], INK, 10, "start", "700"),
          0.5 + i * 0.05,
          0.99,
          D,
        ),
      );
    });
    svg.appendChild(txt(470, 110, "87.5", BP, 26, "middle", "700"));
    svg.appendChild(txt(470, 130, "得分 / 100", MUTE, 9));
    var sy = 200;
    svg.appendChild(line(20, sy, 500, sy, MUTE));
    [0, 25, 50, 75, 100].forEach(function (t) {
      var x = 20 + t * 4.8;
      svg.appendChild(line(x, sy - 4, x, sy + 4, MUTE));
      svg.appendChild(txt(x, sy + 18, String(t), MUTE, 9));
    });
    var mx = 20 + 87.5 * 4.8;
    var marker = group([
      svgEl("polygon", {
        points:
          mx -
          6 +
          "," +
          (sy - 14) +
          " " +
          (mx + 6) +
          "," +
          (sy - 14) +
          " " +
          mx +
          "," +
          (sy - 3),
        fill: WARN,
      }),
      txt(mx, sy - 20, "改进基线", WARN, 10, "middle", "700"),
    ]);
    svg.appendChild(reveal(marker, 0.78, 0.99, D));
    card(
      host,
      "SCORE THE PUBLIC FIXTURES",
      "参考基线",
      svg,
      "评分表对六个已签入的公开评估问题运行完整流水线，检查词汇引用支持、预期来源和关键事实。参考基线得分 87.5，演示也使用其中的 h4。比较时应同时查看三项指标，泛化能力则使用独立私有问题测量。 图表勘误：评分控件使用 0.5／0.25／0.25 权重且缺少标注时返回不可用；本项目实际评分器采用 0.4／0.3／0.3，并将缺少来源或事实标注的项默认设为 1。静态评审图仍显示“completed · 2 sentences dropped”，与实际有删除项时的 needs_review 状态不符。这里只翻译说明，保留原计算与图例，并以运行测试为准。",
    );
  }

  LF.register({
    "pj-rra-pipeline": pipeline,
    "pj-rra-bm25": bm25,
    "pj-rra-snippet-offsets": snippetOffsets,
    "pj-rra-plan-facets": planFacets,
    "pj-rra-cited-writer": citedWriter,
    "pj-rra-critic": critic,
    "pj-rra-publish": publish,
    "pj-rra-scorecard": scorecard,
  });
})();
