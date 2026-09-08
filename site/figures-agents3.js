/* figures-agents3.js - 智能体工程（Agent engineering）的动画课程图表。
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

  // ── htn-tree-expand: 任务树（Task tree）逐节点分解 ──
  function htnTree(host) {
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    function node(x, y, label, on, begin) {
      var fill = on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)';
      var stroke = on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)';
      var r = svgEl('rect', { x: x - 46, y: y - 15, width: 92, height: 30, rx: '4', fill: fill, stroke: stroke, 'stroke-width': '1.5', opacity: '0' });
      r.appendChild(anim('opacity', '0;1', '0.5s', { begin: begin, fill: 'freeze' }));
      var t = txt(x, y + 4, label, '11', on ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)');
      t.setAttribute('opacity', '0');
      t.appendChild(anim('opacity', '0;1', '0.5s', { begin: begin, fill: 'freeze' }));
      return svgEl('g', {}, [r, t]);
    }
    function edge(x1, y1, x2, y2, begin) {
      var l = svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '120', 'stroke-dashoffset': '120' });
      l.appendChild(anim('stroke-dashoffset', '120;0', '0.4s', { begin: begin, fill: 'freeze' }));
      return l;
    }
    svg.appendChild(node(260, 32, 'deliver(pkg)', true, '0s'));
    svg.appendChild(edge(230, 47, 150, 95, '0.5s'));
    svg.appendChild(edge(290, 47, 370, 95, '0.5s'));
    svg.appendChild(node(150, 110, 'pickup', true, '0.9s'));
    svg.appendChild(node(370, 110, 'transport', true, '0.9s'));
    svg.appendChild(edge(150, 125, 90, 188, '1.4s'));
    svg.appendChild(edge(370, 125, 310, 188, '1.4s'));
    svg.appendChild(edge(370, 125, 440, 188, '1.4s'));
    svg.appendChild(node(90, 205, 'drive', false, '1.8s'));
    svg.appendChild(node(310, 205, 'load', false, '1.8s'));
    svg.appendChild(node(440, 205, 'route', false, '1.8s'));
    var lab = txt(260, 240, '复合任务 → 方法 → 原语操作符', '10', 'var(--ink-mute,#777)');
    lab.setAttribute('opacity', '0');
    lab.appendChild(anim('opacity', '0;1', '0.6s', { begin: '2.3s', fill: 'freeze' }));
    svg.appendChild(lab);
    shell(host, '层次任务网络分解（HTN Decomposition）', '逐层展开任务树',
      svg,
      '层次任务网络（Hierarchical Task Network，HTN）规划器将复合任务展开为方法，再将各方法展开为子任务，递归执行直到每个叶节点都是前置条件已满足的原语操作符（Primitive Operator）。任务树自顶向下生长，从左到右读取原语叶节点即可得到计划。图中保留任务标识：deliver(pkg) 为投递包裹，pickup 为取件，transport 为运输，drive 为驾驶，load 为装载，route 为规划路线。');
  }

  // ── workflow-chain: 提示词链（Prompt chaining）各环节依次点亮 ──
  function workflowChain(host) {
    var W = 520, H = 210;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var labels = ['输入', '调用 1', '校验关卡', '调用 2', '输出'];
    var n = labels.length, gap = (W - 60) / (n - 1);
    var i;
    for (i = 0; i < n - 1; i++) {
      var x1 = 30 + gap * i + 30, x2 = 30 + gap * (i + 1) - 30;
      var ln = svgEl('line', { x1: x1, y1: 90, x2: x2, y2: 90, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2', 'stroke-dasharray': '6 5' });
      ln.appendChild(anim('stroke-dashoffset', '22;0', '0.7s', { begin: (i * 0.5) + 's' }));
      svg.appendChild(ln);
    }
    for (i = 0; i < n; i++) {
      var cx = 30 + gap * i;
      var box = svgEl('rect', { x: cx - 30, y: 70, width: 60, height: 40, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      box.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '2.5s', { begin: (i * 0.5) + 's' }));
      svg.appendChild(box);
      svg.appendChild(txt(cx, 94, labels[i], '9', 'var(--ink,#1a1a1a)'));
    }
    var pulse = svgEl('circle', { cx: '0', cy: '90', r: '5', fill: 'var(--warn,#b8870f)' });
    pulse.appendChild(LF.smil('animateMotion', { dur: '2.5s', path: 'M30 90 H490', keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' }));
    svg.appendChild(pulse);
    svg.appendChild(txt(260, 160, '每次调用的输出，成为下一次调用的输入', '10', 'var(--ink-mute,#777)'));
    shell(host, '提示词链（Prompt Chaining）', '一次调用为下一次提供输入',
      svg,
      '最简单的工作流（Workflow）是固定的线性模型调用链：每一步的输出作为下一步的输入，步骤间可加入程序化校验关卡（Gate）。工程师掌控流程图，因此调试成本低，运行行为也可预测。只有无法预先确定步骤时，才需要使用智能体（Agent）。');
  }

  // ── actor-mailbox: 消息异步飞入参与者（Actor）收件箱 ──
  function actorMailbox(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    function actor(x, y, name) {
      var g = svgEl('g', {}, [
        svgEl('rect', { x: x, y: y, width: 110, height: 70, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }),
        svgEl('rect', { x: x + 10, y: y + 12, width: 90, height: 14, rx: '2', fill: 'none', stroke: 'var(--ink-mute,#777)', 'stroke-width': '1', 'stroke-dasharray': '3 2' }),
        txt(x + 55, y + 45, name, '11', 'var(--ink,#1a1a1a)'),
        txt(x + 55, y + 60, '私有状态', '8', 'var(--ink-mute,#777)')
      ]);
      return g;
    }
    svg.appendChild(actor(40, 40, '编码者'));
    svg.appendChild(actor(370, 40, '审查者'));
    svg.appendChild(actor(205, 150, '运行时'));
    function msg(path, dur, begin, color) {
      var c = svgEl('circle', { cx: '0', cy: '0', r: '6', fill: color || 'var(--blueprint,#3553ff)' });
      c.appendChild(svgEl('animateMotion', { dur: dur, begin: begin, repeatCount: 'indefinite', path: path, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' }));
      c.appendChild(anim('opacity', '0;1;1;0', dur, { begin: begin, repeatCount: 'indefinite' }));
      return c;
    }
    svg.appendChild(msg('M150 60 H370', '1.6s', '0s'));
    svg.appendChild(msg('M425 110 L290 150', '1.6s', '0.8s', 'var(--warn,#b8870f)'));
    svg.appendChild(msg('M260 150 L150 75', '1.6s', '1.6s'));
    svg.appendChild(txt(260, 28, '进程间通信（IPC）仅通过消息进行', '10', 'var(--ink-mute,#777)'));
    shell(host, '参与者模型（Actor Model）', '异步消息传递',
      svg,
      '每个智能体都是一个参与者（Actor），拥有私有状态、邮箱（Mailbox）和处理器（Handler）。参与者不共享内存，只发送消息；运行时将消息投递与处理解耦。崩溃被隔离在单个参与者内，并发由模型原生支持，迁移到分布式部署只需改变传输方式。');
  }

  // ── debate-converge: N 个提议者（Proposers）交换批评，答案逐渐收敛 ──
  function debateConverge(host) {
    var W = 520, H = 240, cx = 260, cy = 120, R = 78;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var pts = [], i;
    for (i = 0; i < 4; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 2;
      pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    }
    var j;
    for (i = 0; i < 4; i++) for (j = i + 1; j < 4; j++) {
      var ln = svgEl('line', { x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1', 'stroke-dasharray': '5 4' });
      ln.appendChild(anim('stroke-dashoffset', '18;0', '1.2s', {}));
      ln.appendChild(anim('opacity', '0.25;0.7;0.25', '1.2s', {}));
      svg.appendChild(ln);
    }
    var consensus = svgEl('circle', { cx: cx, cy: cy, r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
    consensus.appendChild(anim('r', '4;16', '4s', {}));
    consensus.appendChild(anim('opacity', '0;0;0.9', '4s', {}));
    svg.appendChild(consensus);
    for (i = 0; i < 4; i++) {
      var dot = svgEl('circle', { cx: pts[i].x, cy: pts[i].y, r: '16', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
      var tr = svgEl('animateTransform', { attributeName: 'transform', type: 'translate', dur: '4s', repeatCount: 'indefinite',
        values: '0 0;' + ((cx - pts[i].x) * 0.4).toFixed(0) + ' ' + ((cy - pts[i].y) * 0.4).toFixed(0) + ';0 0', calcMode: 'spline', keyTimes: '0;0.7;1', keySplines: '0.4 0 0.2 1;0.4 0 0.2 1' });
      var g = svgEl('g', {}, [dot, txt(pts[i].x, pts[i].y + 4, 'A' + (i + 1), '10', 'var(--blueprint,#3553ff)')]);
      g.appendChild(tr);
      svg.appendChild(g);
    }
    svg.appendChild(txt(cx, 228, 'N 个提案者，R 轮交叉评议，逐步收敛', '10', 'var(--ink-mute,#777)'));
    shell(host, '多智能体辩论（Multi-Agent Debate）', '通过评议形成共识',
      svg,
      '各个独立模型实例先提出答案，再进行多轮相互阅读与评议，逐步更新答案并趋向一致。分歧有助于暴露单条思维链（Chain of Thought）不易发现的错误。稀疏拓扑（Sparse Topology）只需部分词元（Token）成本，就可能达到同等准确率；图中展示的是全连接网状拓扑。');
  }

  // ── computer-use-cursor: 光标在模拟用户界面（UI）上滑动 ──
  function computerUse(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 30, y: 20, width: 460, height: 180, rx: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(svgEl('rect', { x: 30, y: 20, width: 460, height: 22, rx: '6', fill: 'var(--rule-soft,#ddd)' }));
    svg.appendChild(svgEl('circle', { cx: 46, cy: 31, r: '4', fill: 'var(--ink-mute,#777)' }));
    var field = svgEl('rect', { x: 60, y: 70, width: 240, height: 26, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--ink-mute,#777)', 'stroke-width': '1' });
    svg.appendChild(field);
    svg.appendChild(txt(70, 88, '搜索……', '11', 'var(--ink-mute,#777)', 'start'));
    var btn = svgEl('rect', { x: 60, y: 130, width: 90, height: 30, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
    btn.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '5s', {}));
    svg.appendChild(btn);
    svg.appendChild(txt(105, 150, '提交', '11', 'var(--ink,#1a1a1a)'));
    var path = 'M400 50 L180 83 L180 83 L105 145 L105 145 L400 50';
    var cur = svgEl('path', { d: 'M0 0 L0 16 L4 12 L8 18 L11 16 L7 11 L13 11 Z', fill: 'var(--ink,#1a1a1a)', stroke: 'var(--bg,#fafaf5)', 'stroke-width': '0.8' });
    cur.appendChild(LF.smil('animateMotion', { dur: '5s', path: path, keyPoints: '0;0.45;0.5;0.9;0.95;1', keyTimes: '0;0.35;0.45;0.75;0.85;1', calcMode: 'linear' }));
    svg.appendChild(cur);
    svg.appendChild(txt(260, 222, '输入截图 → 输出像素坐标', '10', 'var(--ink-mute,#777)'));
    shell(host, '计算机操作（Computer Use）', '通过光标操作屏幕',
      svg,
      '基于视觉的计算机操作读取截图像素，输出与分辨率无关的坐标，再发出键盘和鼠标命令，不依赖无障碍 API（Accessibility API）。屏幕上的所有内容都属于不可信输入，只有用户的直接指令才构成授权，因此每个动作执行前都需要逐步安全检查。');
  }

  // ── voice-pipeline: 波形（Waveform）变为文本词元（Token） ──
  function voicePipeline(host) {
    var W = 520, H = 220;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var stages = ['VAD', 'STT', 'LLM', 'TTS'];
    var i;
    for (i = 0; i < stages.length; i++) {
      var x = 60 + i * 110;
      var b = svgEl('rect', { x: x, y: 150, width: 80, height: 30, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      b.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '3.2s', { begin: (i * 0.6) + 's' }));
      svg.appendChild(b);
      svg.appendChild(txt(x + 40, 169, stages[i], '10', 'var(--ink,#1a1a1a)'));
      if (i < stages.length - 1) {
        var ar = svgEl('line', { x1: x + 80, y1: 165, x2: x + 110, y2: 165, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
        ar.appendChild(anim('stroke-dashoffset', '14;0', '0.6s', { begin: (i * 0.6 + 0.3) + 's' }));
        svg.appendChild(ar);
      }
    }
    var d = 'M40 80';
    var x2;
    for (x2 = 0; x2 <= 18; x2++) { d += ' L' + (40 + x2 * 10) + ' ' + (80 + (x2 % 2 ? -1 : 1) * (8 + 18 * Math.abs(Math.sin(x2)))).toFixed(0); }
    var wave = svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2', 'stroke-dasharray': '420', 'stroke-dashoffset': '420' });
    wave.appendChild(anim('stroke-dashoffset', '420;0', '1.4s', {}));
    wave.appendChild(anim('opacity', '1;1;0', '3.2s', {}));
    svg.appendChild(wave);
    var word = txt(370, 84, '"hello"', '20', 'var(--ink,#1a1a1a)');
    word.setAttribute('opacity', '0');
    word.appendChild(anim('opacity', '0;0;1;1', '3.2s', { fill: 'freeze' }));
    svg.appendChild(word);
    svg.appendChild(txt(260, 208, '端到端延迟预算约 600 ms', '10', 'var(--ink-mute,#777)'));
    shell(host, '语音流水线（Voice Pipeline）', '从音频帧到语音输出',
      svg,
      '语音智能体是一条以帧为单位的流水线，不能仅在文本系统上附加语音合成：语音活动检测（Voice Activity Detection，VAD）、语音转文本（Speech-to-Text，STT）、大语言模型（Large Language Model，LLM）和文本转语音（Text-to-Speech，TTS）都必须在约 600 ms 的总预算内完成。图中的 hello 是语音转写示例，意为“你好”。音频通常分段到达，用户打断（Barge-in）引起的取消信号沿上游传播，因此各阶段都必须流式处理，不能等完整一轮结束。');
  }

  // ── injection-hijack: 恶意词元发出红光，劫持流程 ──
  function injectionHijack(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 30, y: 40, width: 150, height: 100, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(105, 34, '检索到的文档', '10', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(105, 70, '普通文本……', '10', 'var(--ink-soft,#555)'));
    var bad = svgEl('rect', { x: 42, y: 88, width: 126, height: 24, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    bad.appendChild(anim('stroke', 'var(--rule-soft,#ddd);var(--warn,#b8870f);var(--rule-soft,#ddd)', '2.6s', {}));
    svg.appendChild(bad);
    var badt = txt(105, 104, '<转出资金>', '9', 'var(--warn,#b8870f)');
    badt.appendChild(anim('opacity', '0.4;1;0.4', '2.6s', {}));
    svg.appendChild(badt);
    var agent = svgEl('rect', { x: 215, y: 65, width: 90, height: 50, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
    svg.appendChild(agent);
    svg.appendChild(txt(260, 94, '智能体', '11', 'var(--blueprint,#3553ff)'));
    var safe = svgEl('rect', { x: 360, y: 30, width: 130, height: 40, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
    svg.appendChild(safe);
    svg.appendChild(txt(425, 54, '原定工具', '10', 'var(--ink-soft,#555)'));
    var danger = svgEl('rect', { x: 360, y: 110, width: 130, height: 40, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    svg.appendChild(danger);
    svg.appendChild(txt(425, 134, '攻击者指定的工具', '10', 'var(--warn,#b8870f)'));
    var flow = svgEl('line', { x1: 180, y1: 100, x2: 215, y2: 90, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2', 'stroke-dasharray': '5 4' });
    flow.appendChild(anim('stroke-dashoffset', '18;0', '0.8s', {}));
    svg.appendChild(flow);
    var hij = svgEl('line', { x1: 305, y1: 95, x2: 360, y2: 130, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2', 'stroke-dasharray': '5 4' });
    hij.appendChild(anim('stroke-dashoffset', '20;0', '0.8s', { begin: '0.8s' }));
    hij.appendChild(anim('opacity', '0;0;1', '2.6s', {}));
    svg.appendChild(hij);
    svg.appendChild(txt(260, 200, '检索内容中的指令覆盖了开发者提示词', '10', 'var(--ink-mute,#777)'));
    shell(host, '提示词注入（Prompt Injection）', '不可信文本劫持工具调用',
      svg,
      '间接提示词注入（Indirect Prompt Injection）将指令植入智能体检索的内容。模型无法可靠地区分用户意图与检索文本，因此红色恶意词元会将智能体引向攻击者选定的工具。在工具使用边界上，应像对待任意代码一样对待所有检索内容，并在任何调用实际生效前完成验证。');
  }

  // ── failure-cascade: 错误沿智能体链级联传播（Failure cascade） ──
  function failureCascade(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var labels = ['规划', '检索', '推理', '行动'];
    var i;
    for (i = 0; i < labels.length; i++) {
      var x = 50 + i * 120;
      var b = svgEl('rect', { x: x, y: 90, width: 90, height: 44, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      b.appendChild(anim('stroke', 'var(--rule-soft,#ddd);var(--warn,#b8870f)', '3s', { begin: (i * 0.7) + 's', fill: 'freeze' }));
      b.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--bg-surface,#eee);var(--warn,#b8870f)', '3s', { begin: (i * 0.7) + 's', fill: 'freeze' }));
      svg.appendChild(b);
      svg.appendChild(txt(x + 45, 117, labels[i], '11', 'var(--ink,#1a1a1a)'));
      if (i < labels.length - 1) {
        var ln = svgEl('line', { x1: x + 90, y1: 112, x2: x + 120, y2: 112, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
        svg.appendChild(ln);
      }
    }
    var bolt = svgEl('path', { d: 'M0 0 L-5 9 L1 9 L-3 18', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2.5', opacity: '0' });
    bolt.appendChild(LF.smil('animateMotion', { dur: '3s', fill: 'freeze', path: 'M95 75 L215 75 L335 75 L455 75', keyPoints: '0;0.33;0.66;1', keyTimes: '0;0.33;0.66;1', calcMode: 'linear' }));
    bolt.appendChild(anim('opacity', '0;1;1;1', '3s', {}));
    svg.appendChild(bolt);
    svg.appendChild(txt(260, 50, '一个错误步骤就会污染后续所有环节', '11', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(260, 200, '幻觉导致的动作 → 级联传播 → 上下文丢失', '10', 'var(--ink-mute,#777)'));
    shell(host, '级联故障（Cascading Failure）', '一个错误沿调用链向下传播',
      svg,
      '智能体故障不是随机噪声，而是会呈现反复出现的模式。级联错误的代价最高：一个由幻觉（Hallucination）产生的步骤写入下一步的输入，使单次错误动作沿规划、检索、推理与行动传播。识别并命名这些模式，才能有针对性地监测，并尽早切断传播链。');
  }

  LF.register({
    'htn-tree-expand': htnTree,
    'workflow-chain': workflowChain,
    'actor-mailbox': actorMailbox,
    'debate-converge': debateConverge,
    'computer-use-cursor': computerUse,
    'voice-pipeline': voicePipeline,
    'injection-hijack': injectionHijack,
    'failure-cascade': failureCascade
  });
})();
