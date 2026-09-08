/* figures-agents4.js - 智能体工程（Agent engineering）的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，使用 ES5，主题由 CSS 变量控制。
   动画仅使用 SMIL，不使用 JS 渲染循环。编写方式：使用一个以以下某个组件名称为内容的
   ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur };
    if (extra) for (var k in extra) a[k] = extra[k];
    return LF.smil('animate', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11', fill: fill || 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }

  // -- ae-memory-fusion: 一个查询分流至三个存储，融合评分（Score fusion） --
  function memoryFusion(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var stores = [
      { y: 50, name: '向量（Vector）', sub: '语义', w: '0.50' },
      { y: 110, name: '键值（KV）', sub: '事实查询', w: '0.30' },
      { y: 170, name: '图（Graph）', sub: '关系', w: '0.20' }
    ];
    svg.appendChild(svgEl('rect', { x: 24, y: 95, width: 80, height: 40, rx: '5', fill: 'var(--blueprint,#3553ff)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(64, 119, '查询', '11', 'var(--bg,#fafaf5)'));
    var i;
    for (i = 0; i < 3; i++) {
      var s = stores[i];
      var b = svgEl('rect', { x: 210, y: s.y, width: 110, height: 40, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      b.appendChild(anim('stroke', 'var(--rule-soft,#ddd);var(--blueprint,#3553ff);var(--rule-soft,#ddd)', '3s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(b);
      svg.appendChild(txt(265, s.y + 17, s.name, '11', 'var(--blueprint,#3553ff)'));
      svg.appendChild(txt(265, s.y + 31, s.sub, '8', 'var(--ink-mute,#777)'));
      var into = svgEl('line', { x1: 104, y1: 115, x2: 210, y2: s.y + 20, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
      into.appendChild(anim('stroke-dashoffset', '18;0', '0.8s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(into);
      var out = svgEl('line', { x1: 320, y1: s.y + 20, x2: 420, y2: 115, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
      out.appendChild(anim('stroke-dashoffset', '18;0', '0.8s', { begin: (1.4 + i * 0.4) + 's' }));
      svg.appendChild(out);
      var pulse = svgEl('circle', { cx: '0', cy: '0', r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
      pulse.appendChild(LF.smil('animateMotion', { dur: '3s', begin: (i * 0.4) + 's', path: 'M320 ' + (s.y + 20) + ' L420 115', keyPoints: '0;0;1;1', keyTimes: '0;0.5;0.85;1', calcMode: 'linear' }));
      pulse.appendChild(anim('opacity', '0;0;1;1', '3s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(pulse);
      svg.appendChild(txt(355, s.y + 17, 'w ' + s.w, '8', 'var(--ink-mute,#777)'));
    }
    var fuse = svgEl('rect', { x: 420, y: 95, width: 76, height: 40, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
    fuse.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '3s', { begin: '2.2s' }));
    svg.appendChild(fuse);
    svg.appendChild(txt(458, 119, '融合', '11', 'var(--ink,#1a1a1a)'));
    svg.appendChild(txt(260, 232, '得分 = 相关性、重要性与近期程度的加权和', '10', 'var(--ink-mute,#777)'));
    shell(host, '混合记忆（Hybrid Memory）', '一次查询，三类存储',
      svg,
      'Mem0 将每条记忆同时写入三类存储，并在检索时融合结果。向量存储负责语义相似度，键值存储（Key-Value Store，KV）负责事实查询，图存储负责关系推理。通过对相关性（Relevance）、重要性（Importance）和近期程度（Recency）加权评分，将三类结果融合，使统一的 add/search 接口适配三类查询，避免单一存储总有两类查询不擅长的问题。');
  }

  // -- ae-crew-vs-flow: 自主角色网（Role mesh）与确定性链对比 --
  function crewVsFlow(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(txt(135, 28, '团队（Crew）', '11', 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(135, 42, '自主协作，按角色分工', '8', 'var(--ink-mute,#777)'));
    var roles = [[70, 80], [200, 80], [135, 160]];
    var i, j;
    for (i = 0; i < 3; i++) for (j = i + 1; j < 3; j++) {
      var ln = svgEl('line', { x1: roles[i][0], y1: roles[i][1], x2: roles[j][0], y2: roles[j][1], stroke: 'var(--ink-soft,#555)', 'stroke-width': '1', 'stroke-dasharray': '5 4' });
      ln.appendChild(anim('opacity', '0.2;0.8;0.2', '2.4s', { begin: ((i + j) * 0.3) + 's', repeatCount: 'indefinite' }));
      ln.appendChild(anim('stroke-dashoffset', '18;0', '1s', { begin: ((i + j) * 0.3) + 's' }));
      svg.appendChild(ln);
    }
    var names = ['研究', '写作', '编辑'];
    for (i = 0; i < 3; i++) {
      var c = svgEl('circle', { cx: roles[i][0], cy: roles[i][1], r: '20', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
      c.appendChild(anim('opacity', '0.65;1;0.65', '2.4s', { begin: (i * 0.5) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(c);
      svg.appendChild(txt(roles[i][0], roles[i][1] + 3, names[i], '8', 'var(--blueprint,#3553ff)'));
    }
    svg.appendChild(svgEl('line', { x1: 290, y1: 30, x2: 290, y2: 210, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(txt(405, 28, '流程（Flow）', '11', 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(405, 42, '事件驱动，确定性执行', '8', 'var(--ink-mute,#777)'));
    var steps = ['获取', '路由', '发出结果'];
    for (i = 0; i < 3; i++) {
      var y = 70 + i * 50;
      var b = svgEl('rect', { x: 350, y: y, width: 110, height: 34, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      b.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '3s', { begin: (i * 0.6) + 's' }));
      svg.appendChild(b);
      svg.appendChild(txt(405, y + 21, steps[i], '10', 'var(--ink,#1a1a1a)'));
      if (i < 2) {
        var ar = svgEl('line', { x1: 405, y1: y + 34, x2: 405, y2: y + 50, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
        ar.appendChild(anim('stroke-dashoffset', '14;0', '0.5s', { begin: (i * 0.6 + 0.3) + 's' }));
        svg.appendChild(ar);
      }
    }
    svg.appendChild(txt(260, 236, '文档建议：生产应用从 Flow 开始', '10', 'var(--ink-mute,#777)'));
    shell(host, '团队（Crew）与流程（Flow）', '一个框架，两种组织方式',
      svg,
      'CrewAI 提供两种顶层组织方式。团队（Crew）通过角色分工自主协作，智能体在松散的网状结构中相互评议，适合探索性工作。流程（Flow）是一条事件驱动的确定性执行链，可以回放、审计并核算成本。文档明确建议：任何面向生产的应用都应从 Flow 开始。');
  }

  // -- ae-agent-handoff: transfer_to 工具在智能体间移交控制权（Handoff） --
  function agentHandoff(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    function agent(x, label) {
      svg.appendChild(svgEl('rect', { x: x, y: 80, width: 120, height: 56, rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
      svg.appendChild(txt(x + 60, 105, label, '11', 'var(--blueprint,#3553ff)'));
      svg.appendChild(txt(x + 60, 122, '智能体', '8', 'var(--ink-mute,#777)'));
    }
    agent(40, '分流（Triage）');
    agent(360, '退款（Refund）');
    var path = svgEl('path', { d: 'M160 108 C240 60, 280 60, 360 108', fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.6', 'stroke-dasharray': '6 5' });
    path.appendChild(anim('stroke-dashoffset', '22;0', '1s', {}));
    svg.appendChild(path);
    var tool = svgEl('rect', { x: 195, y: 30, width: 130, height: 26, rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    svg.appendChild(tool);
    var toolt = txt(260, 48, 'transfer_to_refund', '9', 'var(--warn,#b8870f)');
    toolt.appendChild(anim('opacity', '0.4;1;1', '2.4s', {}));
    svg.appendChild(toolt);
    var ctx = svgEl('circle', { cx: '0', cy: '0', r: '6', fill: 'var(--blueprint,#3553ff)' });
    ctx.appendChild(LF.smil('animateMotion', { dur: '2.4s', path: 'M160 108 C240 60, 280 60, 360 108', keyPoints: '0;0;1;1', keyTimes: '0;0.3;0.8;1', calcMode: 'linear' }));
    ctx.appendChild(anim('opacity', '0;1;1;1', '2.4s', {}));
    svg.appendChild(ctx);
    svg.appendChild(txt(260, 170, '交接是一种可供模型调用的工具', '11', 'var(--ink,#1a1a1a)'));
    svg.appendChild(txt(260, 200, '对话上下文随控制权一同转交', '10', 'var(--ink-mute,#777)'));
    shell(host, '智能体交接（Agent Handoff）', '用工具调用表达委派',
      svg,
      '在 OpenAI Agents SDK 中，交接（Handoff）就是名为 transfer_to_<agent> 的工具。分流智能体调用它时，控制权与当前对话上下文一并转交给目标智能体，由目标继续会话。将委派建模为普通工具，可以保持循环形式统一：模型决定交接的方式，与决定调用任意函数的方式相同。');
  }

  // -- ae-subagent-isolation: 父智能体生成具有全新上下文（Context）的子智能体 --
  function subagentIsolation(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 200, y: 24, width: 120, height: 46, rx: '6', fill: 'var(--blueprint,#3553ff)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(260, 44, '编排器', '11', 'var(--bg,#fafaf5)'));
    svg.appendChild(txt(260, 60, '主上下文', '8', 'var(--bg-surface,#cdd6ff)'));
    var kids = [80, 260, 440];
    var i;
    for (i = 0; i < 3; i++) {
      var x = kids[i];
      var edge = svgEl('line', { x1: 260, y1: 70, x2: x, y2: 130, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '90', 'stroke-dashoffset': '90' });
      edge.appendChild(anim('stroke-dashoffset', '90;0', '0.5s', { begin: (i * 0.5) + 's', fill: 'freeze' }));
      svg.appendChild(edge);
      var ring = svgEl('rect', { x: x - 52, y: 130, width: 104, height: 54, rx: '6', fill: 'none', stroke: 'var(--ink-mute,#777)', 'stroke-width': '1', 'stroke-dasharray': '4 3' });
      svg.appendChild(ring);
      var b = svgEl('rect', { x: x - 46, y: 136, width: 92, height: 42, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', opacity: '0' });
      b.appendChild(anim('opacity', '0;1', '0.5s', { begin: (0.5 + i * 0.5) + 's', fill: 'freeze' }));
      svg.appendChild(b);
      var t1 = txt(x, 157, '子智能体 ' + (i + 1), '9', 'var(--blueprint,#3553ff)');
      t1.setAttribute('opacity', '0');
      t1.appendChild(anim('opacity', '0;1', '0.5s', { begin: (0.5 + i * 0.5) + 's', fill: 'freeze' }));
      svg.appendChild(t1);
      var t2 = txt(x, 171, '独立上下文窗口', '8', 'var(--ink-mute,#777)');
      t2.setAttribute('opacity', '0');
      t2.appendChild(anim('opacity', '0;1', '0.5s', { begin: (0.5 + i * 0.5) + 's', fill: 'freeze' }));
      svg.appendChild(t2);
      var ret = svgEl('circle', { cx: '0', cy: '0', r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
      ret.appendChild(LF.smil('animateMotion', { dur: '4s', begin: (i * 0.5) + 's', path: 'M' + x + ' 130 L260 70', keyPoints: '0;0;1;1', keyTimes: '0;0.6;0.9;1', calcMode: 'linear' }));
      ret.appendChild(anim('opacity', '0;0;1;1', '4s', { begin: (i * 0.5) + 's' }));
      svg.appendChild(ret);
    }
    svg.appendChild(txt(260, 218, '每个子智能体在隔离上下文中运行，只返回摘要', '10', 'var(--ink-mute,#777)'));
    shell(host, '子智能体隔离（Subagent Isolation）', '分发任务，收回摘要',
      svg,
      'Claude Agent SDK 创建的子智能体（Subagent）分别在独立上下文窗口（Context Window）中运行，图中虚线表示边界。编排器（Orchestrator）的主上下文保持精简：子智能体并行探索，只返回简短摘要。这样既获得并行能力，也实现上下文隔离，冗杂的搜索结果不会挤满父智能体的对话记录。');
  }

  // -- ae-swebench-gate: 使用 FAIL_TO_PASS 单元测试（Unit tests）检验补丁 --
  function swebenchGate(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 30, y: 95, width: 100, height: 46, rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(80, 114, '智能体', '11', 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(80, 130, '补丁', '8', 'var(--ink-mute,#777)'));
    var arr = svgEl('line', { x1: 130, y1: 118, x2: 185, y2: 118, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.6', 'stroke-dasharray': '5 4' });
    arr.appendChild(anim('stroke-dashoffset', '18;0', '0.8s', {}));
    svg.appendChild(arr);
    svg.appendChild(svgEl('rect', { x: 185, y: 40, width: 150, height: 156, rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(260, 34, '测试执行框架（Test Harness）', '10', 'var(--ink-mute,#777)'));
    var tests = [
      { y: 60, lab: 'FAIL_TO_PASS', begin: '0.8s' },
      { y: 95, lab: 'FAIL_TO_PASS', begin: '1.3s' },
      { y: 130, lab: 'PASS_TO_PASS', begin: '1.8s' },
      { y: 165, lab: 'PASS_TO_PASS', begin: '2.3s' }
    ];
    var i;
    for (i = 0; i < tests.length; i++) {
      var t = tests[i];
      var dot = svgEl('circle', { cx: 205, cy: t.y + 10, r: '6', fill: 'var(--rule-soft,#ddd)', stroke: 'var(--ink-mute,#777)', 'stroke-width': '1' });
      dot.appendChild(anim('fill', 'var(--rule-soft,#ddd);var(--blueprint,#3553ff)', '4s', { begin: t.begin, fill: 'freeze' }));
      svg.appendChild(dot);
      svg.appendChild(txt(222, t.y + 14, t.lab, '9', 'var(--ink-soft,#555)', 'start'));
      var chk = svgEl('path', { d: 'M202 ' + (t.y + 10) + ' l3 3 l5 -6', fill: 'none', stroke: 'var(--bg,#fafaf5)', 'stroke-width': '1.6', opacity: '0' });
      chk.appendChild(anim('opacity', '0;1', '0.3s', { begin: t.begin, fill: 'freeze' }));
      svg.appendChild(chk);
    }
    var gate = svgEl('rect', { x: 390, y: 95, width: 100, height: 46, rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    gate.appendChild(anim('stroke', 'var(--warn,#b8870f);var(--blueprint,#3553ff)', '4s', { begin: '2.6s', fill: 'freeze' }));
    svg.appendChild(gate);
    var res = txt(440, 122, '已解决', '10', 'var(--ink,#1a1a1a)');
    svg.appendChild(res);
    var g2 = svgEl('line', { x1: 335, y1: 118, x2: 390, y2: 118, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.6', 'stroke-dasharray': '5 4' });
    g2.appendChild(anim('stroke-dashoffset', '18;0', '0.8s', { begin: '2.6s' }));
    svg.appendChild(g2);
    svg.appendChild(txt(260, 222, '只有所有验收测试通过，才算解决', '10', 'var(--ink-mute,#777)'));
    shell(host, 'SWE-bench 验收关卡（Gate）', '通过执行测试为补丁评分',
      svg,
      'SWE-bench 通过运行仓库测试套件为补丁评分，不依赖模型判断补丁看起来是否正确。只有原先失败的 FAIL_TO_PASS 测试现在通过，而且原先通过的 PASS_TO_PASS 测试仍然通过，任务才算解决。基于执行的评分（Execution-Based Grading）使基准不易被投机刷分；SWE-bench Verified 也因此剔除了测试含糊或损坏的任务。');
  }

  // -- ae-agent-human-gap: 智能体曲线上升，两根条形之间的差距缩小 --
  function agentHumanGap(host) {
    var W = 520, H = 240, PAD = 44, base = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: PAD, y1: base, x2: W - 20, y2: base, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    svg.appendChild(svgEl('line', { x1: PAD, y1: 30, x2: PAD, y2: base, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    var humanY = 50;
    svg.appendChild(svgEl('line', { x1: PAD, y1: humanY, x2: W - 20, y2: humanY, stroke: 'var(--ink-mute,#777)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' }));
    svg.appendChild(txt(W - 24, humanY - 6, '人类约 78%', '9', 'var(--ink-mute,#777)', 'end'));
    var x0 = PAD + 20, x1 = W - 60, y0 = base - 22, y1 = base - 120;
    var line = svgEl('path', { d: 'M' + x0 + ' ' + y0 + ' Q ' + ((x0 + x1) / 2) + ' ' + (y0 - 10) + ' ' + x1 + ' ' + y1, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.4', 'stroke-dasharray': '320', 'stroke-dashoffset': '320' });
    line.appendChild(anim('stroke-dashoffset', '320;0', '3s', { begin: '0.3s', fill: 'freeze' }));
    svg.appendChild(line);
    var head = svgEl('circle', { cx: x0, cy: y0, r: '5', fill: 'var(--blueprint,#3553ff)' });
    head.appendChild(svgEl('animateMotion', { dur: '3s', begin: '0.3s', fill: 'freeze', repeatCount: '1', path: 'M0 0 Q ' + ((x1 - x0) / 2) + ' ' + ((y1 - y0) / 2 - 10) + ' ' + (x1 - x0) + ' ' + (y1 - y0), keyTimes: '0;1', keyPoints: '0;1', calcMode: 'linear' }));
    svg.appendChild(head);
    svg.appendChild(txt(x0, base + 16, '2023', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(x1, base + 16, '2026', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(x0 + 4, y0 - 10, '14%', '9', 'var(--blueprint,#3553ff)', 'start'));
    svg.appendChild(txt(260, 236, '差距缩小，界面定位与操作知识仍是故障来源', '10', 'var(--ink-mute,#777)'));
    shell(host, '智能体（Agent）与人类', '差距正在缩小',
      svg,
      'WebArena 和 OSWorld 发布时显示出明显差距：最佳智能体接近 14%，人类约为 78%。蓝线逐年上升，但两类故障模式没有改变：智能体仍缺乏图形界面定位（GUI Grounding，即应点击哪里）和操作知识（Operational Knowledge，即任务实际上需要做什么），因此分数提升快于可靠性提升。');
  }

  // -- ae-genai-span-tree: 嵌套的 OTel 跨度（Spans）按父子顺序绘制 --
  function genaiSpanTree(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var spans = [
      { x: 40, w: 440, y: 40, lab: 'invoke_agent  CLIENT', begin: '0s', kind: 'agent' },
      { x: 80, w: 200, y: 80, lab: 'execute_tool  search', begin: '0.6s', kind: 'tool' },
      { x: 120, w: 120, y: 120, lab: 'chat  GPT 模型', begin: '1.2s', kind: 'model' },
      { x: 80, w: 240, y: 160, lab: 'execute_tool  fetch', begin: '1.8s', kind: 'tool' },
      { x: 120, w: 150, y: 200, lab: 'chat  Claude 模型', begin: '2.4s', kind: 'model' }
    ];
    var i;
    for (i = 0; i < spans.length; i++) {
      var s = spans[i];
      var fill = s.kind === 'agent' ? 'var(--blueprint,#3553ff)' : s.kind === 'tool' ? 'var(--bg-surface,#eee)' : 'var(--bg,#fafaf5)';
      var stroke = s.kind === 'model' ? 'var(--ink-mute,#777)' : 'var(--blueprint,#3553ff)';
      var ink = s.kind === 'agent' ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)';
      var bar = svgEl('rect', { x: s.x, y: s.y, width: '0', height: 24, rx: '3', fill: fill, stroke: stroke, 'stroke-width': '1.4' });
      bar.appendChild(anim('width', '0;' + s.w, '0.5s', { begin: s.begin, fill: 'freeze' }));
      svg.appendChild(bar);
      var t = txt(s.x + 8, s.y + 16, s.lab, '9', ink, 'start');
      t.setAttribute('opacity', '0');
      t.appendChild(anim('opacity', '0;1', '0.4s', { begin: s.begin, fill: 'freeze' }));
      svg.appendChild(t);
      if (i > 0) {
        var px = spans[i].x - 18;
        var conn = svgEl('path', { d: 'M' + px + ' ' + (spans[i - (s.kind === 'model' ? 1 : (i === 3 ? 3 : 1))].y + 24) + ' V ' + (s.y + 12) + ' H ' + s.x, fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1', 'stroke-dasharray': '2 2', opacity: '0' });
        conn.appendChild(anim('opacity', '0;0.7', '0.3s', { begin: s.begin, fill: 'freeze' }));
        svg.appendChild(conn);
      }
    }
    svg.appendChild(txt(260, 238, '统一模式：智能体 > 工具 > 模型，约定父子关系', '9', 'var(--ink-mute,#777)'));
    shell(host, '生成式 AI 跨度树（GenAI Span Tree）', '嵌套的标准遥测数据',
      svg,
      'OpenTelemetry 的生成式 AI（Generative AI，GenAI）约定为各厂商提供统一的数据模式（Schema）。invoke_agent 跨度（Span）是根节点，每个 execute_tool 跨度是其子节点，每个模型 chat 跨度又隶属于调用它的工具。名称与父子关系标准化后，同一条追踪（Trace）在 Datadog、Grafana、Jaeger 或 Honeycomb 中都能按相同方式解读。');
  }

  // -- ae-eval-three-layers: 评估循环（Eval loop）包围构建过程，形成三重环 --
  function evalThreeLayers(host) {
    var W = 520, H = 250, cx = 175, cy = 125;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var rings = [
      { r: 96, lab: '线上生产评估', dash: '12 8', dur: '8s', op: '0.45' },
      { r: 70, lab: '自定义离线评估', dash: '9 7', dur: '6s', op: '0.65' },
      { r: 44, lab: '静态基准', dash: '6 5', dur: '4s', op: '0.85' }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var ring = svgEl('circle', { cx: cx, cy: cy, r: rings[i].r, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', 'stroke-dasharray': rings[i].dash, opacity: rings[i].op });
      var rot = svgEl('animateTransform', { attributeName: 'transform', type: 'rotate', from: '0 ' + cx + ' ' + cy, to: '360 ' + cx + ' ' + cy, dur: rings[i].dur, repeatCount: 'indefinite' });
      ring.appendChild(rot);
      svg.appendChild(ring);
    }
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '22', fill: 'var(--blueprint,#3553ff)' }));
    svg.appendChild(txt(cx, cy - 1, '构建', '10', 'var(--bg,#fafaf5)'));
    svg.appendChild(txt(cx, cy + 12, '智能体', '8', 'var(--bg-surface,#cdd6ff)'));
    var labelsX = 300;
    for (i = 0; i < 3; i++) {
      var y = 78 + i * 36;
      svg.appendChild(svgEl('circle', { cx: labelsX, cy: y - 4, r: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', 'stroke-dasharray': rings[2 - i].dash }));
      svg.appendChild(txt(labelsX + 14, y, rings[2 - i].lab, '11', 'var(--ink,#1a1a1a)', 'start'));
    }
    var notes = ['SWE-bench、GAIA、BFCL', '模型评审、执行、轨迹', '真实流量、回归、验收关卡'];
    for (i = 0; i < 3; i++) {
      svg.appendChild(txt(labelsX + 14, 78 + i * 36 + 14, notes[i], '8', 'var(--ink-mute,#777)', 'start'));
    }
    svg.appendChild(txt(260, 236, '评估贯穿外层循环，不仅是最后一步', '10', 'var(--ink-mute,#777)'));
    shell(host, '评估驱动循环（Eval-Driven Loop）', '围绕构建过程的三层评估',
      svg,
      '评估（Evaluation）是驱动每个决策的外层循环，而非最后勾选的检查项。静态基准用于确定模型，自定义离线评估衡量具体产品的表现，线上生产评估在真实流量中捕获回归。离线方法包括大语言模型评审（LLM Judge）、执行评估和轨迹评估（Trajectory Evaluation）。三层评估持续围绕构建过程运行，因此 2026 年的实践是将评估与代码一同维护，在持续集成（Continuous Integration，CI）中作为每个拉取请求（Pull Request，PR）的验收关卡。');
  }

  LF.register({
    'ae-memory-fusion': memoryFusion,
    'ae-crew-vs-flow': crewVsFlow,
    'ae-agent-handoff': agentHandoff,
    'ae-subagent-isolation': subagentIsolation,
    'ae-swebench-gate': swebenchGate,
    'ae-agent-human-gap': agentHumanGap,
    'ae-genai-span-tree': genaiSpanTree,
    'ae-eval-three-layers': evalThreeLayers
  });
})();
