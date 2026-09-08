/* figures-agents-alignment.js - 智能体工程（Agent engineering）、多智能体群体（Multi-agent swarms）与对齐（Alignment）的交互课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，使用 ES5，主题由
   CSS 变量控制。编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function arrowDefs() {
    var marker = svgEl('marker', { id: 'lf-aa-arrow', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, [
      svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })
    ]);
    return svgEl('defs', {}, [marker]);
  }
  function box(x, y, w, h, label, on) {
    var r = svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
    var t = svgEl('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: on ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(label));
    return svgEl('g', {}, [r, t]);
  }
  function arrow(x1, y1, x2, y2, dash) {
    return svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'marker-end': 'url(#lf-aa-arrow)', 'stroke-dasharray': dash || '' });
  }

  // ── agent-loop: 持久因果轨迹（Causal trace），证据流入上下文（Context） ──
  function agentLoop(host) {
    var state = { step: 0 };
    var W = 620, H = 330;
    var markerId = LF.uid('lf-agent-loop-arrow');
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    var title = svgEl('title', { id: LF.uid('lf-agent-loop-title') });
    title.appendChild(document.createTextNode('智能体循环的十二步因果轨迹（Agent Loop Causal Trace）'));
    var desc = svgEl('desc', { id: LF.uid('lf-agent-loop-desc') });
    desc.appendChild(document.createTextNode('持续执行思考、行动、工具调用、观察和上下文更新。所选步骤突出显示当前节点、因果边和已积累的证据。'));
    svg.setAttribute('aria-labelledby', title.id + ' ' + desc.id);
    svg.appendChild(title);
    svg.appendChild(desc);
    svg.appendChild(svgEl('defs', {}, [
      svgEl('marker', { id: markerId, viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, [
        svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'context-stroke' })
      ])
    ]));
    var meta = el('div', { class: 'lf-meta', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    var nodes = [
      { id: 'think', x: 28, y: 34, w: 112, label: '思考（Think）' },
      { id: 'act', x: 188, y: 34, w: 112, label: '行动（Act）' },
      { id: 'tool', x: 348, y: 34, w: 112, label: '工具（Tool）' },
      { id: 'observe', x: 444, y: 146, w: 132, label: '观察（Observe）' },
      { id: 'context', x: 204, y: 146, w: 132, label: '上下文（Context）' }
    ];
    var edgeSpecs = [
      { id: 'think-act', d: 'M140 56 H178' },
      { id: 'act-tool', d: 'M300 56 H338' },
      { id: 'tool-observe', d: 'M460 56 C528 56 548 102 510 136' },
      { id: 'observe-context', d: 'M444 168 H346' },
      { id: 'context-think', d: 'M204 168 C92 168 74 106 84 86' }
    ];
    var steps = [
      { node: 0, edge: -1, phase: '思考', note: '阅读目标和执行轨迹，再形成计划。', evidence: 0, value: '查找市区人口' },
      { node: 1, edge: 0, phase: '选定动作', note: '当前缺少证据，因此选择 search_web。', evidence: 1, value: 'search_web' },
      { node: 2, edge: 1, phase: '工具调用', note: '将明确的查询参数传给选定工具。', evidence: 1, value: 'query: Tokyo' },
      { node: 2, edge: 2, phase: '工具结果', note: '工具返回都市圈人口结果。', evidence: 2, value: '都市圈 3700 万' },
      { node: 3, edge: 2, phase: '观察', note: '发现都市圈人口不能回答市区人口问题。', evidence: 3, value: '范围不匹配' },
      { node: 4, edge: 3, phase: '更新上下文', note: '将结果及范围不匹配的问题加入执行轨迹。', evidence: 4, value: '已加入证据' },
      { node: 0, edge: 4, phase: '再次思考', note: '利用更新后的上下文改进下一步计划。', evidence: 0, value: '核实 23 区' },
      { node: 1, edge: 0, phase: '选定动作', note: '按修正后的范围选择更精确的搜索。', evidence: 1, value: 'search_web' },
      { node: 2, edge: 1, phase: '工具调用', note: '查询东京市区人口。', evidence: 1, value: 'query: 23 wards' },
      { node: 2, edge: 2, phase: '工具结果', note: '工具返回指定范围的人口证据。', evidence: 2, value: '23 区 1400 万' },
      { node: 3, edge: 2, phase: '观察', note: '确认结果符合请求范围。', evidence: 3, value: '范围匹配' },
      { node: 4, edge: 3, phase: '更新上下文', note: '保存有证据支持的答案，供下一次思考完成任务。', evidence: 4, value: '可以作答' }
    ];
    var evidenceSpecs = [
      { label: '计划', x: 18 },
      { label: '动作', x: 138 },
      { label: '结果', x: 258 },
      { label: '观察', x: 378 },
      { label: '上下文', x: 498 }
    ];
    var edgeEls = [];
    var nodeEls = [];
    var evidenceEls = [];
    var stepText = svgEl('text', {
      x: '310', y: '124', 'text-anchor': 'middle',
      'font-family': 'var(--font-mono,monospace)', 'font-size': '10',
      fill: 'var(--ink-mute,#777)'
    });

    edgeSpecs.forEach(function (edge) {
      var path = svgEl('path', {
        d: edge.d, fill: 'none', stroke: 'var(--rule-soft,#c9c9c2)', 'stroke-width': '2',
        'marker-end': 'url(#' + markerId + ')', 'data-part': 'edge-' + edge.id,
        style: 'transition:stroke 180ms var(--ease-out,cubic-bezier(.23,1,.32,1)),opacity 180ms var(--ease-out,cubic-bezier(.23,1,.32,1))'
      });
      edgeEls.push(path);
      svg.appendChild(path);
    });

    nodes.forEach(function (node) {
      var inner = svgEl('g', {
        'data-part': 'node-' + node.id,
        style: 'transform-box:fill-box;transform-origin:center;transition:transform 220ms var(--ease-out,cubic-bezier(.23,1,.32,1)),opacity 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))'
      });
      var rect = svgEl('rect', {
        width: node.w, height: '44', rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5',
        style: 'transition:fill 180ms var(--ease-out,cubic-bezier(.23,1,.32,1)),stroke 180ms var(--ease-out,cubic-bezier(.23,1,.32,1))'
      });
      var text = svgEl('text', {
        x: node.w / 2, y: '26', 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: 'var(--ink,#1a1a1a)',
        style: 'transition:fill 180ms var(--ease-out,cubic-bezier(.23,1,.32,1))'
      });
      text.appendChild(document.createTextNode(node.label));
      inner.appendChild(rect);
      inner.appendChild(text);
      svg.appendChild(svgEl('g', { transform: 'translate(' + node.x + ' ' + node.y + ')' }, [inner]));
      nodeEls.push({ group: inner, rect: rect, text: text });
    });

    svg.appendChild(stepText);
    svg.appendChild(svgEl('line', { x1: '18', y1: '218', x2: '602', y2: '218', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 4' }));
    var laneLabel = svgEl('text', { x: '18', y: '209', 'font-family': 'var(--font-mono,monospace)', 'font-size': '9', fill: 'var(--ink-mute,#777)', 'letter-spacing': '0' });
    laneLabel.appendChild(document.createTextNode('进入下一次思考的证据'));
    svg.appendChild(laneLabel);

    evidenceSpecs.forEach(function (item, index) {
      var inner = svgEl('g', {
        'data-part': 'evidence-' + index, opacity: '0.24',
        style: 'transform-box:fill-box;transform-origin:center;transition:opacity 220ms var(--ease-out,cubic-bezier(.23,1,.32,1)),transform 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))'
      });
      var rect = svgEl('rect', { width: '104', height: '62', rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' });
      var label = svgEl('text', { x: '8', y: '17', 'font-family': 'var(--font-mono,monospace)', 'font-size': '8.5', fill: 'var(--blueprint,#3553ff)', 'letter-spacing': '0' });
      label.appendChild(document.createTextNode(item.label));
      var value = svgEl('text', { x: '8', y: '39', 'font-family': 'var(--font-mono,monospace)', 'font-size': '9.5', fill: 'var(--ink-soft,#555)' });
      value.appendChild(document.createTextNode('等待中'));
      inner.appendChild(rect);
      inner.appendChild(label);
      inner.appendChild(value);
      svg.appendChild(svgEl('g', { transform: 'translate(' + item.x + ' 236)' }, [inner]));
      evidenceEls.push({ group: inner, rect: rect, value: value });
    });

    state._render = function () {
      var current = steps[state.step];
      var i;
      for (i = 0; i < nodeEls.length; i++) {
        var activeNode = i === current.node;
        nodeEls[i].group.style.transform = activeNode ? 'translateY(-3px)' : 'translateY(0)';
        nodeEls[i].group.style.opacity = activeNode ? '1' : '0.72';
        nodeEls[i].rect.setAttribute('fill', activeNode ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)');
        nodeEls[i].rect.setAttribute('stroke', activeNode ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)');
        nodeEls[i].text.setAttribute('fill', activeNode ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)');
      }
      for (i = 0; i < edgeEls.length; i++) {
        var activeEdge = i === current.edge;
        edgeEls[i].setAttribute('stroke', activeEdge ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#c9c9c2)');
        edgeEls[i].setAttribute('opacity', activeEdge ? '1' : '0.58');
      }
      var accumulated = {};
      for (i = 0; i <= state.step; i++) accumulated[steps[i].evidence] = steps[i].value;
      for (i = 0; i < evidenceEls.length; i++) {
        var visible = Object.prototype.hasOwnProperty.call(accumulated, i);
        var activeEvidence = i === current.evidence;
        evidenceEls[i].group.setAttribute('opacity', visible ? (activeEvidence ? '1' : '0.72') : '0.24');
        evidenceEls[i].group.style.transform = activeEvidence ? 'translateY(-4px)' : 'translateY(0)';
        evidenceEls[i].rect.setAttribute('stroke', activeEvidence ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)');
        evidenceEls[i].value.textContent = visible ? accumulated[i] : '等待中';
      }
      stepText.textContent = '第 ' + (state.step + 1) + ' / 12 步  ·  ' + current.phase;
      meta.textContent = current.phase + '：' + current.note + '只有达到目标或耗尽步骤预算时，循环才会停止。';
    };
    var grid = el('div', {}, [LF.slider(state, 'step', '因果步骤（Causal Step）', 0, 11, 1, function (value) { return (value + 1) + ' / 12'; })]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['智能体循环（Agent Loop）']), el('span', {}, ['选择步骤'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta])]),
      el('div', { class: 'lf-cap' }, ['智能体循环（Agent Loop）是一条因果轨迹（Causal Trajectory），图中节点的变化表达因果联系：每次思考选择动作，工具调用产生证据，观察更新上下文，新上下文又改变下一次思考。'])
    ]));
    state._render();
  }

  // ── react-trace: 思考（Thought）/行动（Action）/观察（Observation）各行逐步展开 ──
  function reactTrace(host) {
    var state = { step: 1 };
    var trace = [
      ['Thought', '我需要东京当前的人口数量。'],
      ['Action', 'search("Tokyo population 2026")'],
      ['Observation', '“东京都市圈：约 3700 万人。”'],
      ['Thought', '问题问的是市区人口，不是都市圈。'],
      ['Action', 'search("Tokyo city proper population")'],
      ['Observation', '“东京（23 区）：约 1400 万人。”'],
      ['Thought', '现在有足够的数据可以作答。'],
      ['Action', 'finish("About 14 million in the 23 wards.")']
    ];
    var rows = el('div', {});
    var meta = el('div', { class: 'lf-meta' });
    function color(kind) { return kind === 'Thought' ? 'var(--warn,#b8870f)' : kind === 'Action' ? 'var(--blueprint,#3553ff)' : 'var(--ink-soft,#555)'; }
    state._render = function () {
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var n = state.step, i;
      for (i = 0; i < n; i++) {
        var k = trace[i][0], v = trace[i][1];
        var tag = el('b', { style: 'color:' + color(k) + ';min-width:90px;display:inline-block' }, [{ Thought: '思考（Thought）', Action: '行动（Action）', Observation: '观察（Observation）' }[k]]);
        rows.appendChild(el('div', {
          class: 'lf-formula',
          style: 'padding:5px 8px;border-left:2px solid ' + color(k) + ';margin-top:4px;background:var(--bg-surface,#eee)'
        }, [tag, document.createTextNode(' ' + v)]));
      }
      var last = trace[n - 1][0];
      meta.textContent = '已显示 ' + n + ' / ' + trace.length + ' 行  ·  ' + (last === 'Observation' ? '工具结果已返回，智能体接下来推理' : last === 'Action' && trace[n - 1][1].indexOf('finish') === 0 ? '智能体已给出最终答案' : last === 'Action' ? '等待工具结果' : '为下一步行动推理');
    };
    var grid = el('div', {}, [LF.slider(state, 'step', '显示到第几步', 1, 8, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['ReAct 执行轨迹（Trace）']), el('span', {}, ['逐步展开'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, meta])]),
      el('div', { class: 'lf-cap' }, ['ReAct 将推理（Reasoning）与行动（Acting）交错进行。每条思考决定下一步，每个行动调用工具，每次观察将结果反馈回来。显式记录推理，让智能体能够发现并纠正走错的方向。图中的 search 和 finish 保留原始示例调用：分别搜索东京人口、搜索东京市区人口，最终回答“23 区约 1400 万人”。'])
    ]));
    state._render();
  }

  // ── tool-routing: 根据描述匹配，将查询映射到一个已注册工具（Tool） ──
  function toolRouting(host) {
    var tools = [
      { name: 'search_web', desc: '查找事实与时事' },
      { name: 'run_python', desc: '计算、解析和转换数据' },
      { name: 'send_email', desc: '撰写并发送消息' },
      { name: 'query_db', desc: '查询数据库中的记录' }
    ];
    var queries = [
      { text: '法国的 GDP 是多少', sim: [0.91, 0.18, 0.05, 0.31] },
      { text: '合计这些费用', sim: [0.12, 0.88, 0.09, 0.27] },
      { text: '通知团队我们已发布', sim: [0.10, 0.07, 0.93, 0.06] },
      { text: '有多少用户注册', sim: [0.34, 0.30, 0.05, 0.86] }
    ];
    var state = { q: '0' };
    var rows = el('div', {});
    var meta = el('div', { class: 'lf-meta' });
    state._render = function () {
      var q = queries[Number(state.q)];
      var best = 0, bi = 0, i;
      for (i = 0; i < q.sim.length; i++) { if (q.sim[i] > best) { best = q.sim[i]; bi = i; } }
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      tools.forEach(function (t, idx) {
        var on = idx === bi;
        var bar = el('i'); bar.style.transform = 'scaleX(' + q.sim[idx].toFixed(3) + ')';
        if (!on) bar.style.background = 'var(--rule-soft,#ccc)';
        var lab = el('label', {}, [t.name + '（' + t.desc + '）', el('b', {}, [on ? '已路由 →' : q.sim[idx].toFixed(2)])]);
        if (!on) lab.style.opacity = '0.5';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [bar])]));
      });
      meta.textContent = '查询“' + q.text + '” → ' + tools[bi].name + '（与工具描述的相似度 ' + best.toFixed(2) + '）';
    };
    var grid = el('div', {}, [LF.select(state, 'q', '查询（Query）', [
      ['法国的 GDP 是多少', '0'], ['合计这些费用', '1'], ['通知团队我们已发布', '2'], ['有多少用户注册', '3']
    ])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['工具路由（Tool Routing）']), el('span', {}, ['选择查询'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, meta])]),
      el('div', { class: 'lf-cap' }, ['路由器（Router）计算查询与各注册工具描述的匹配分数，选择最接近的工具。函数名称和描述是路由器决定调用哪个工具的依据，准确命名会直接影响路由质量。'])
    ]));
    state._render();
  }

  // ── swarm-messages: 全互连（All-to-all）O(N^2) 与枢纽/监督者（Hub/supervisor）O(N) 对比 ──
  function swarmMessages(host) {
    var state = { n: 6 };
    var W = 520, H = 240, R = 78;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function ring(cx, cy, n, drawHub) {
      var pts = [], i;
      for (i = 0; i < n; i++) {
        var a = -Math.PI / 2 + 2 * Math.PI * i / n;
        pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
      }
      var g = svgEl('g', {});
      if (drawHub) {
        for (i = 0; i < n; i++) {
          g.appendChild(svgEl('line', { x1: cx, y1: cy, x2: pts[i].x, y2: pts[i].y, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1', opacity: '0.8' }));
        }
        g.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '11', fill: 'var(--blueprint,#3553ff)' }));
      } else {
        for (i = 0; i < n; i++) {
          for (var j = i + 1; j < n; j++) {
            g.appendChild(svgEl('line', { x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y, stroke: 'var(--warn,#b8870f)', 'stroke-width': '0.8', opacity: '0.5' }));
          }
        }
      }
      for (i = 0; i < n; i++) {
        g.appendChild(svgEl('circle', { cx: pts[i].x, cy: pts[i].y, r: '7', fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      }
      return g;
    }
    state._render = function () {
      var n = state.n;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(ring(140, 120, n, false));
      svg.appendChild(ring(390, 120, n, true));
      [['全互联', 140], ['中心节点 / 监督者', 390]].forEach(function (p) {
        var t = svgEl('text', { x: p[1], y: 224, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: 'var(--ink-mute,#777)' });
        t.appendChild(document.createTextNode(p[0])); svg.appendChild(t);
      });
      var mesh = n * (n - 1);
      meta.textContent = '全互联：' + mesh + ' 条有向消息（N·(N−1)）  ·  中心式：' + (2 * n) + ' 条边（O(N)）';
      formula.textContent = '广播成本为 O(N²)；通过监督者集中转发，成本降为 O(N)';
    };
    var grid = el('div', {}, [LF.slider(state, 'n', '智能体数量 N', 2, 12, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['群体消息（Swarm Messages）']), el('span', {}, ['调整 N'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['若每个智能体都与其他所有智能体通信，消息数为 N·(N−1)，直接广播的成本呈平方增长。将所有消息经监督者（Supervisor）转发，可使连接边数降为线性规模，因此大型系统通常集中协调，而非采用全互联（All-to-All）通信。'])
    ]));
    state._render();
  }

  // ── supervisor-hierarchy: 分支因子（Branching factor）与深度 → 智能体总数 ──
  function supervisorHierarchy(host) {
    var state = { b: 3, depth: 2 };
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var b = state.b, depth = state.depth;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      var level, levelTop = 28, rowH = (H - 56) / Math.max(1, depth), capped = false;
      var prev = [{ x: W / 2 }];
      svg.appendChild(svgEl('circle', { cx: W / 2, cy: levelTop, r: '10', fill: 'var(--blueprint,#3553ff)' }));
      for (level = 1; level <= depth; level++) {
        var count = Math.pow(b, level);
        if (count > 64) { count = 64; capped = true; }
        var y = levelTop + rowH * level;
        var cur = [];
        var k;
        for (k = 0; k < count; k++) {
          var x = (W) * (k + 1) / (count + 1);
          cur.push({ x: x });
          var parent = prev[Math.floor(k / b) % prev.length] || prev[0];
          svg.appendChild(svgEl('line', { x1: parent.x, y1: levelTop + rowH * (level - 1) + 8, x2: x, y2: y - 7, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
          svg.appendChild(svgEl('circle', { cx: x, cy: y, r: level === depth ? '6' : '8', fill: level === depth ? 'var(--bg-surface,#eee)' : 'var(--blueprint,#3553ff)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
        }
        prev = cur;
      }
      var exact = 0, lv; for (lv = 0; lv <= depth; lv++) { exact += Math.pow(b, lv); }
      meta.textContent = '分支数 ' + b + '，深度 ' + depth + '  →  共 ' + exact + ' 个智能体' + (capped ? ' · 图中每层最多显示 64 个' : '') + '（叶子执行工作，内部节点负责委派）';
      formula.textContent = b === 1
        ? '总数 = Σ 1^level，level 从 0 到 depth = depth + 1 = ' + exact
        : '总数 = Σ b^level，level 从 0 到 depth = (b^(depth+1) − 1) / (b − 1) = ' + exact;
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'b', '分支因子（Branching Factor）b', 1, 5, 1),
      LF.slider(state, 'depth', '深度（Depth）', 1, 3, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['监督者层级（Supervisor Hierarchy）']), el('span', {}, ['调整分支数与深度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['监督者将任务分给工作智能体（Worker Agent），工作智能体也可以继续担任监督者。智能体总数是各深度分支因子幂次的几何级数之和，因此即使扇出（Fan-Out）较小，数量也会迅速膨胀。层级树应保持较浅。'])
    ]));
    state._render();
  }

  // ── rlhf-reward-kl: reward − beta·KL；较小的 beta 允许策略（Policy）漂移 ──
  function rlhfRewardKL(host) {
    var state = { beta: 0.2 };
    var W = 520, H = 220, PAD = 34, SMAX = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(s) { return PAD + s / SMAX * (W - 2 * PAD); }
    var YMAX = 1.65, YMIN = -0.65;
    function py(v) { return H - PAD - ((v - YMIN) / (YMAX - YMIN)) * (H - 2 * PAD); }
    function rawReward(s) { return 1 - Math.exp(-s / 40); }
    function kl(s) { return Math.pow(s / SMAX, 2) * 1.6; }
    state._render = function () {
      var beta = state.beta;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      function curve(fn, st, dash) {
        var d = '', i; for (i = 0; i <= 120; i++) { var s = SMAX * i / 120; d += (i ? 'L' : 'M') + px(s).toFixed(1) + ' ' + py(fn(s)).toFixed(1) + ' '; }
        svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: st, 'stroke-width': '1.8', 'stroke-dasharray': dash || '' }));
      }
      curve(rawReward, 'var(--ink-mute,#999)', '4 3');
      curve(function (s) { return beta * kl(s); }, 'var(--warn,#b8870f)', '2 3');
      var obj = function (s) { return rawReward(s) - beta * kl(s); };
      curve(obj, 'var(--blueprint,#3553ff)');
      var best = 0, bv = -1e9, peakDrift, sStep;
      for (sStep = 0; sStep <= SMAX; sStep += 2) { var v = obj(sStep); if (v > bv) { bv = v; best = sStep; } }
      svg.appendChild(svgEl('circle', { cx: px(best), cy: py(obj(best)), r: '4.5', fill: 'var(--blueprint,#3553ff)' }));
      peakDrift = kl(best);
      var hacking = best >= SMAX - 4 && beta < 0.15;
      status.innerHTML = hacking ? '奖励投机' : '第 ' + best + ' 步达到峰值';
      meta.textContent = hacking ? 'beta 太小：缺少将策略拉回的约束，策略过度优化代理奖励并偏离参考模型'
        : 'KL 惩罚使最优点的漂移为 ' + peakDrift.toFixed(2) + '；目标值到达峰值后下降';
      formula.textContent = '目标 = reward − β·KL(π ‖ π_ref),  β = ' + beta.toFixed(2) + '（灰色为奖励，金色为 β·KL，蓝色为目标）';
    };
    var grid = el('div', {}, [LF.slider(state, 'beta', 'KL 惩罚系数 β', 0.02, 1.0, 0.02)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['RLHF：奖励 − β·KL']), el('span', {}, ['调整 β'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['基于人类反馈的强化学习（Reinforcement Learning from Human Feedback，RLHF）最大化“奖励减去 KL 惩罚”，使策略保持接近参考模型。β 太小时约束过弱，策略会追逐代理奖励（Proxy Reward），利用奖励模型的缺陷并逐渐偏离参考模型。KL 散度（Kullback-Leibler Divergence）项用于约束这种奖励投机（Reward Hacking）。'])
    ]));
    state._render();
  }

  // ── dpo-margin: 被选与被拒回答的对数概率（Log-probs）及 DPO 损失曲线 ──
  function dpoMargin(host) {
    var state = { margin: 1.0, beta: 1.0 };
    var W = 520, H = 200, PAD = 34, MMAX = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function loss(m, beta) { return -Math.log(sigmoid(beta * m)); }
    function px(m) { return PAD + (m + MMAX) / (2 * MMAX) * (W - 2 * PAD); }
    var LMAX = loss(-MMAX, 1.0);
    function py(l) { return H - PAD - Math.min(l, LMAX) / LMAX * (H - 2 * PAD); }
    state._render = function () {
      var m = state.margin, beta = state.beta;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: px(0), y1: PAD, x2: px(0), y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', i; for (i = 0; i <= 120; i++) { var mm = -MMAX + 2 * MMAX * i / 120; d += (i ? 'L' : 'M') + px(mm).toFixed(1) + ' ' + py(loss(mm, beta)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('circle', { cx: px(m), cy: py(loss(m, beta)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = loss(m, beta).toFixed(3) + ' <small>DPO 损失</small>';
      meta.textContent = (m > 0 ? '选中回答高于未选中回答 ' + m.toFixed(2) : m < 0 ? '未选中回答被错误地排在选中回答之前' : '持平') + '  ·  P(偏好选中回答) = ' + sigmoid(beta * m).toFixed(2);
      formula.textContent = 'loss = −log σ(β·(r_chosen − r_rejected)),  margin = ' + m.toFixed(2) + ', β = ' + beta.toFixed(1) + '   ·   间隔越大，损失越低';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'margin', '奖励间隔（Reward Margin，chosen − rejected）', -4, 4, 0.1),
      LF.slider(state, 'beta', 'β', 0.2, 3.0, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['DPO 奖励间隔（Margin）']), el('span', {}, ['调整间隔'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['直接偏好优化（Direct Preference Optimization，DPO）直接用偏好对训练，无须单独的奖励模型。损失为 −log σ，其输入是 β 乘以选中（chosen）与未选中（rejected）回答之间的隐式奖励间隔。较大的正间隔使损失趋近于零；负间隔意味着未选中回答排得更高，会受到较重惩罚。'])
    ]));
    state._render();
  }

  // ── context-budget: tokens/turn × turns 填充固定窗口（Window） ──
  function contextBudget(host) {
    var state = { perTurn: 1200, turns: 14, windowK: 32 };
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var win = state.windowK * 1024;
      var used = state.perTurn * state.turns;
      var pct = used / win * 100;
      num.innerHTML = LF.fmtInt(used) + ' <small>/ ' + LF.fmtInt(win) + ' 词元</small>';
      bar.style.transform = 'scaleX(' + Math.min(1, pct / 100) + ')';
      barWrap.classList.toggle('over', used > win);
      var turnsToFull = Math.ceil(win / state.perTurn);
      meta.textContent = (used > win ? '窗口已超限：' : '已用 ' + Math.round(pct) + '%：')
        + (used > win ? '必须压缩较早轮次，或交接到新上下文' : '接近上限时触发压缩，大约在第 ' + turnsToFull + ' 轮');
      formula.textContent = state.perTurn + ' 词元/轮 × ' + state.turns + ' 轮 = ' + LF.fmtInt(used) + '  ·  窗口 ' + state.windowK + 'K = ' + LF.fmtInt(win);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'perTurn', '每轮词元数', 200, 4000, 100),
      LF.slider(state, 'turns', '轮次', 1, 60, 1),
      LF.slider(state, 'windowK', '上下文窗口（Context Window，K）', 8, 200, 8)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['上下文预算（Context Budget）']), el('span', {}, ['调整轮次与窗口'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每轮都会向固定大小的窗口追加词元。累计用量接近上限时，智能体必须将旧轮次压缩（Compaction）为摘要，或交接（Handoff）到新上下文。管理好这份预算，是长会话持续运行的前提。'])
    ]));
    state._render();
  }

  // ── guardrail-gates: 有序安全门控（Safety gates），任一触发 → 阻断 ──
  function guardrailGates(host) {
    var state = { trip: '0' };
    var W = 620, H = 150;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var gates = ['输入过滤', '策略检查', '输出过滤'];
    var notes = ['已阻止：模型运行前拒绝恶意或违反策略的提示词',
      '已阻止：模型输出违反使用策略',
      '已阻止：从回答中清除不安全内容'];
    state._render = function () {
      var trip = Number(state.trip);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      var allowed = trip === 0;
      var bw = 110, gap = 22, x0 = 18, y = 44, h = 46;
      svg.appendChild(box(x0, y, 70, h, '请求', false));
      var prevX = x0 + 70, i;
      for (i = 0; i < 3; i++) {
        var gx = prevX + gap;
        var tripped = trip === i + 1;
        svg.appendChild(arrow(prevX, y + h / 2, gx, y + h / 2));
        svg.appendChild(box(gx, y, bw, h, gates[i], tripped));
        if (tripped) {
          var blockT = svgEl('text', { x: gx + bw / 2, y: y - 8, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: 'var(--warn,#b8870f)' });
          blockT.appendChild(document.createTextNode('阻止'));
          svg.appendChild(blockT);
        }
        prevX = gx + bw;
        if (tripped) { break; }
      }
      if (allowed) { svg.appendChild(arrow(prevX, y + h / 2, prevX + gap, y + h / 2)); svg.appendChild(box(prevX + gap, y, 80, h, '放行', false)); }
      status.innerHTML = allowed ? '已放行' : '已阻止';
      meta.textContent = allowed ? '全部关卡通过：将回答返回用户' : notes[trip - 1];
    };
    var grid = el('div', {}, [LF.select(state, 'trip', '触发的关卡', [
      ['无 / 全部通过', '0'], ['输入过滤（Input Filter）', '1'], ['策略检查（Policy Check）', '2'], ['输出过滤（Output Filter）', '3']
    ])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['安全护栏关卡（Guardrail Gates）']), el('span', {}, ['选择关卡'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta])]),
      el('div', { class: 'lf-cap' }, ['安全检查按有序关卡执行：模型前的输入过滤器（Input Filter）、针对请求的策略检查（Policy Check），以及针对回答的输出过滤器（Output Filter）。最先触发的关卡会阻止请求，使不安全提示词无法到达模型，不安全输出无法到达用户。'])
    ]));
    state._render();
  }

  LF.register({
    'agent-loop': agentLoop,
    'react-trace': reactTrace,
    'tool-routing': toolRouting,
    'swarm-messages': swarmMessages,
    'supervisor-hierarchy': supervisorHierarchy,
    'rlhf-reward-kl': rlhfRewardKL,
    'dpo-margin': dpoMargin,
    'context-budget': contextBudget,
    'guardrail-gates': guardrailGates
  });
})();
