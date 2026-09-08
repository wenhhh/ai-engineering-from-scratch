/* figures-infra2.js：阶段 17（基础设施与生产（Infrastructure and production））
   的动画课程图表，涵盖服务（Serving）、路由（Routing）、缓存（Caching）、自动扩缩容（Autoscaling）。在
   lesson-figures.js 之后加载，通过 window.LF.register 注册。原生 ES5，
   无依赖，主题由 CSS 变量控制。动画仅使用 SMIL（animate / animateMotion /
   animateTransform）。编写时仍使用相同的围栏块：
       ```figure
       cache-aware-router
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, select = LF.select;

  var BP = 'var(--blueprint,#3553ff)';
  var SOFT = 'var(--rule-soft,#ccc)';
  var MUTE = 'var(--ink-mute,#999)';
  var WARN = 'var(--warn,#b8870f)';
  var INK = 'var(--ink,#1a1a1a)';
  var BG = 'var(--bg,#fafaf5)';

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function motion(path, dur, begin) {
    return svgEl('animateMotion', { path: path, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' });
  }
  function box(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: 4, fill: fill || 'none', stroke: stroke || SOFT, 'stroke-width': 1.4 });
  }
  function txt(x, y, s, size, fill, anchor) {
    return svgEl('text', { x: x, y: y, 'font-family': 'var(--font-mono,monospace)', 'font-size': size || 11, fill: fill || MUTE, 'text-anchor': anchor || 'middle' }, [document.createTextNode(s)]);
  }

  // ── cache-aware-router: 轮询（Round-robin）分散与前缀哈希（Prefix-hash）路由对比 ──
  // 11-multi-region-kv-locality
  function cacheAwareRouter(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var src = { x: 60, y: 120 };
    var reps = [{ x: 430, y: 50 }, { x: 430, y: 120 }, { x: 430, y: 190 }];
    svg.appendChild(box(30, 100, 60, 40, BG, INK));
    svg.appendChild(txt(60, 124, '路由器', 10, INK));
    reps.forEach(function (r, i) {
      svg.appendChild(box(r.x - 38, r.y - 18, 76, 36, BG, i === 1 ? BP : SOFT));
      svg.appendChild(txt(r.x, r.y - 2, '副本 ' + (i + 1), 9, i === 1 ? BP : MUTE));
      svg.appendChild(txt(r.x, r.y + 11, i === 1 ? '缓存：P' : '未预热', 8, MUTE));
    });
    // 通向副本 2（持有前缀 P）的热路径（Hot path），用活动虚线连接
    var hot = svgEl('path', { d: 'M90 120 L392 120', fill: 'none', stroke: BP, 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    hot.appendChild(anim('stroke-dashoffset', '22;0', '0.9s'));
    svg.appendChild(hot);
    svg.appendChild(svgEl('path', { d: 'M90 110 L392 60', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    svg.appendChild(svgEl('path', { d: 'M90 130 L392 188', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    // 携带前缀 P 的请求流入，并被路由到热副本（Hot replica）
    var i;
    for (i = 0; i < 3; i++) {
      var g = svgEl('g', { opacity: 0 }, [
        svgEl('circle', { cx: 0, cy: 0, r: 6, fill: BP }),
        txt(0, 3, 'P', 8, BG)
      ]);
      g.appendChild(anim('opacity', '1;1', '2.4s', { begin: (i * 0.8) + 's' }));
      g.appendChild(motion('M10 120 L60 120 L430 120', '2.4s', (i * 0.8) + 's'));
      svg.appendChild(g);
    }
    svg.appendChild(txt(70, 175, '按前缀哈希路由', 9, MUTE));
    svg.appendChild(txt(410, 225, 'P 请求复用已预热缓存', 9, BP));
    shell(host, '缓存感知路由（Cache-Aware Router）', '请求发往已持有对应前缀的副本', svg,
      '轮询（Round-Robin）分发不考虑缓存位置，多数请求因此未命中缓存，需承担完整预填充（Prefill）成本。缓存感知路由器对提示词前缀取哈希，将匹配请求发往已持有对应键值缓存（KV Cache）块的副本，使已预热路径持续命中缓存，首词元延迟（Time to First Token，TTFT）不再受完整预填充耗时限制。');
  }

  // ── cold-start-layers: 权重沿 NVMe→DRAM→HBM 流动，副本变为就绪状态 ──
  // 10-cold-start-mitigation
  function coldStartLayers(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var tiers = [
      { x: 30, t: 'NVMe', s: '磁盘上的权重' },
      { x: 180, t: 'DRAM', s: '暂存权重' },
      { x: 330, t: 'HBM', s: 'GPU 上的权重' }
    ];
    tiers.forEach(function (ti) {
      svg.appendChild(box(ti.x, 70, 100, 90, BG, MUTE));
      svg.appendChild(txt(ti.x + 50, 60, ti.t, 9, MUTE));
      svg.appendChild(txt(ti.x + 50, 175, ti.s, 8, MUTE));
    });
    // 最右侧从冷态变为热态（Cold→warm）的副本
    svg.appendChild(box(450, 90, 60, 50, BG, SOFT));
    var lamp = svgEl('circle', { cx: 480, cy: 115, r: 9, fill: SOFT });
    lamp.appendChild(anim('fill', SOFT + ';' + SOFT + ';' + BP + ';' + BP, '5s'));
    svg.appendChild(lamp);
    var lampTxt = txt(480, 160, '冷副本', 8, MUTE);
    svg.appendChild(lampTxt);
    var warmTxt = txt(480, 75, '提供服务', 8, BP);
    warmTxt.appendChild(anim('opacity', '0;0;0;1;1', '5s'));
    svg.appendChild(warmTxt);
    // 层级之间的连接，使用活动虚线
    [[130, 180], [280, 330], [430, 450]].forEach(function (seg) {
      var p = svgEl('path', { d: 'M' + seg[0] + ' 115 L' + seg[1] + ' 115', fill: 'none', stroke: INK, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' });
      p.appendChild(anim('stroke-dashoffset', '16;0', '0.7s'));
      svg.appendChild(p);
    });
    // 权重块通过分层流水线（Tiered pipeline）流动
    var i;
    for (i = 0; i < 4; i++) {
      var blk = svgEl('rect', { x: -9, y: -7, width: 18, height: 14, rx: 2, fill: BP, opacity: 0.85 });
      blk.appendChild(motion('M80 115 L130 115 L180 115 L280 115 L330 115 L430 115 L480 115', '5s', (i * 1.0) + 's'));
      svg.appendChild(blk);
    }
    svg.appendChild(txt(255, 215, '分层加载：NVMe → DRAM → HBM，然后副本开始服务', 9, MUTE));
    shell(host, '冷启动流水线（Cold-Start Pipeline）', '权重逐层加载，冷副本变为已预热副本', svg,
      '副本数缩至零后，新副本必须等权重驻留高带宽内存（High Bandwidth Memory，HBM）才能响应。冷启动（Cold Start）预算包含节点供给、权重下载、加载至 HBM 和引擎初始化；70B 模型可能需要数分钟，而服务等级协议（Service-Level Agreement，SLA）只允许两秒。分层加载让权重沿 NVMe → 动态随机存取存储器（DRAM）→ HBM 流式传输；预热池（Warm Pool）保持 min_workers>0，以空闲 GPU 成本换取消除冷启动尾延迟。');
  }

  // ── model-cascade-router: 优先使用便宜模型，置信度（Confidence）低时升级 ──
  // 16-model-routing
  function modelCascadeRouter(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(30, 95, 56, 40, BG, INK));
    svg.appendChild(txt(58, 112, '调度器', 9, INK));
    svg.appendChild(txt(58, 125, '置信度？', 8, MUTE));
    // 便宜模型在上方，处理大部分流量；前沿模型（Frontier）在下方，处理升级请求
    svg.appendChild(box(380, 40, 110, 44, BG, BP));
    svg.appendChild(txt(435, 58, '低成本模型', 9, BP));
    svg.appendChild(txt(435, 72, '70% · $0.25/M', 8, MUTE));
    svg.appendChild(box(380, 150, 110, 44, BG, WARN));
    svg.appendChild(txt(435, 168, '前沿模型', 9, WARN));
    svg.appendChild(txt(435, 182, '30% · $10/M', 8, MUTE));
    svg.appendChild(svgEl('path', { d: 'M86 110 L376 62', fill: 'none', stroke: BP, 'stroke-width': 1.6 }));
    var esc = svgEl('path', { d: 'M86 120 L376 172', fill: 'none', stroke: WARN, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' });
    esc.appendChild(anim('stroke-dashoffset', '18;0', '1s'));
    svg.appendChild(esc);
    // 7 个请求进入，多数转向便宜模型（蓝色），部分升级（warn）
    var i;
    for (i = 0; i < 7; i++) {
      var esc2 = i % 3 === 0;
      var g = svgEl('g', {}, [svgEl('circle', { cx: 0, cy: 0, r: 5, fill: esc2 ? WARN : BP })]);
      var path = esc2 ? 'M-20 115 L58 115 L435 172' : 'M-20 115 L58 115 L435 62';
      g.appendChild(motion(path, '2.6s', (i * 0.34) + 's'));
      svg.appendChild(g);
    }
    svg.appendChild(txt(260, 220, '混合成本 ≈ 0.7 × 低成本模型 + 0.3 × 前沿模型', 9, MUTE));
    shell(host, '模型级联路由（Model Cascade Router）', '先用低成本模型，难题再升级', svg,
      '调度器（Broker）按任务类型、长度和置信度对请求评分，将多数简单请求发给低成本模型。只有低置信度请求沿虚线升级到前沿模型（Frontier Model）。多数流量只需少量费用，质量相同时总账单可降低 20%–60%。风险是低成本模型悄然发生漂移，只有线上质量关卡（Quality Gate）才能捕获。');
  }

  // ── prefill-decode-split: 两个池（Pools），通过 NIXL 移交 KV 缓存（KV cache） ──
  // 17-disaggregated-prefill-decode
  function prefillDecodeSplit(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(60, 50, 130, 130, BG, BP));
    svg.appendChild(txt(125, 40, '预填充池（Prefill Pool）', 9, BP));
    svg.appendChild(txt(125, 70, '计算受限', 8, MUTE));
    svg.appendChild(box(330, 50, 130, 130, BG, WARN));
    svg.appendChild(txt(395, 40, '解码池（Decode Pool）', 9, WARN));
    svg.appendChild(txt(395, 70, '内存带宽受限', 8, MUTE));
    // 预填充（Prefill）GPU 持续计算，填充色脉动；解码（Decode）GPU 流式输出
    var i, gx, gy;
    for (i = 0; i < 4; i++) {
      gx = 80 + (i % 2) * 55; gy = 95 + Math.floor(i / 2) * 45;
      var pg = svgEl('rect', { x: gx, y: gy, width: 40, height: 30, rx: 3, fill: BP, opacity: 0.25 });
      pg.appendChild(anim('opacity', '0.2;0.7;0.2', '1.3s', { begin: (i * 0.2) + 's' }));
      svg.appendChild(pg);
    }
    for (i = 0; i < 4; i++) {
      gx = 350 + (i % 2) * 55; gy = 95 + Math.floor(i / 2) * 45;
      svg.appendChild(svgEl('rect', { x: gx, y: gy, width: 40, height: 30, rx: 3, fill: WARN, opacity: 0.22 }));
    }
    // KV 缓存块经 NIXL 链路传输
    var link = svgEl('path', { d: 'M190 115 L330 115', fill: 'none', stroke: INK, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' });
    link.appendChild(anim('stroke-dashoffset', '16;0', '0.7s'));
    svg.appendChild(link);
    svg.appendChild(txt(260, 108, 'NIXL', 8, INK));
    for (i = 0; i < 3; i++) {
      var kv = svgEl('rect', { x: -10, y: -7, width: 16, height: 14, rx: 2, fill: INK });
      kv.appendChild(motion('M190 115 L330 115', '1.6s', (i * 0.55) + 's'));
      svg.appendChild(kv);
    }
    svg.appendChild(txt(260, 200, '键值缓存从预填充池传输到解码池', 9, INK));
    svg.appendChild(txt(260, 216, '各资源池按自身瓶颈配置容量', 9, MUTE));
    shell(host, '预填充与解码分离（Prefill / Decode Split）', '两个资源池之间传递键值缓存', svg,
      '预填充是计算受限（Compute-Bound）的，解码是内存带宽受限（Memory-Bound）的。两者共置于同一 GPU，会浪费当前阶段没有充分利用的资源。分离式部署（Disaggregation）为各自瓶颈配置独立资源池，通过高带宽 NIXL 链路传输键值缓存（KV Cache）。长提示词能从中获益，短提示词的收益则不足以抵消传输成本。');
  }

  // ── batch-lane-triage: 将工作负载（Workloads）分入各泳道，批处理在夜间排空 ──
  // 15-batch-apis
  function batchLaneTriage(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var lanes = [
      { y: 45, t: '交互式', s: '同步 · 全价', c: WARN },
      { y: 110, t: '半交互式', s: '异步队列', c: MUTE },
      { y: 175, t: '批处理', s: '五折 · 约 24 小时', c: BP }
    ];
    lanes.forEach(function (ln) {
      svg.appendChild(svgEl('line', { x1: 150, y1: ln.y, x2: 470, y2: ln.y, stroke: ln.c, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.6 }));
      svg.appendChild(txt(95, ln.y - 4, ln.t, 9, ln.c));
      svg.appendChild(txt(95, ln.y + 9, ln.s, 7, MUTE));
    });
    svg.appendChild(box(140, 100, 30, 50, BG, INK));
    svg.appendChild(txt(155, 90, '分流', 8, INK));
    // 任务进入，大部分落入批处理（Batch）泳道（蓝色），少量进入交互（Interactive）泳道（warn）
    var spec = [
      { c: WARN, y: 45, b: '0s' }, { c: BP, y: 175, b: '0.5s' }, { c: BP, y: 175, b: '1.0s' },
      { c: MUTE, y: 110, b: '1.5s' }, { c: BP, y: 175, b: '2.0s' }, { c: BP, y: 175, b: '2.6s' }
    ];
    spec.forEach(function (s) {
      var g = svgEl('g', {}, [svgEl('rect', { x: -6, y: -6, width: 12, height: 12, rx: 2, fill: s.c })]);
      g.appendChild(motion('M-20 115 L155 115 L155 ' + s.y + ' L460 ' + s.y, '3.4s', s.b));
      svg.appendChild(g);
    });
    // 批处理泳道在夜间排空：填充条向右扫动后重置
    var drain = svgEl('rect', { x: 150, y: 188, width: 0, height: 4, fill: BP, opacity: 0.5 });
    drain.appendChild(anim('width', '0;320;320;0', '5s'));
    svg.appendChild(drain);
    svg.appendChild(txt(310, 215, '非交互任务应进入批处理通道', 9, BP));
    shell(host, '批处理通道分流（Batch Lane Triage）', '工作负载分通道，批处理可在夜间完成', svg,
      '每个新增大语言模型工作负载都应分入三类通道。交互式任务按全价同步执行；半交互式任务进入异步队列；能容忍 24 小时延迟的任务进入批处理（Batch）通道，享受五折，再叠加输入缓存，成本可降至同步调用的约 10%。许多号称需要实时处理的任务，其实只需第二天早晨得到答案。');
  }

  // ── semantic-cache-hit: 相似提示词（Prompts）由缓存处理，与冷启动 LLM 对比 ──
  // 14-prompt-semantic-caching
  function semanticCacheHit(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(150, 95, 70, 44, BG, INK));
    svg.appendChild(txt(185, 113, '缓存', 9, INK));
    svg.appendChild(txt(185, 127, '嵌入向量', 8, MUTE));
    svg.appendChild(box(390, 40, 100, 40, BG, WARN));
    svg.appendChild(txt(440, 58, 'LLM 冷路径', 9, WARN));
    svg.appendChild(txt(440, 72, '慢 · $$$', 8, MUTE));
    svg.appendChild(box(390, 150, 100, 40, BG, BP));
    svg.appendChild(txt(440, 168, '缓存命中', 9, BP));
    svg.appendChild(txt(440, 182, '快 · 约 $0', 8, MUTE));
    // 命中路径（Hit path）较近且快；未命中路径（Miss path）较远，通往 LLM
    var hit = svgEl('path', { d: 'M220 120 L388 170', fill: 'none', stroke: BP, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
    hit.appendChild(anim('stroke-dashoffset', '20;0', '0.6s'));
    svg.appendChild(hit);
    svg.appendChild(svgEl('path', { d: 'M220 110 L388 60', fill: 'none', stroke: SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
    // 查询流入；相似查询（蓝色）命中，新查询（warn）未命中并转向 LLM
    var spec = [{ c: BP, p: 'M-20 117 L185 117 L440 170', b: '0s' }, { c: BP, p: 'M-20 117 L185 117 L440 170', b: '0.9s' }, { c: WARN, p: 'M-20 117 L185 117 L440 60', b: '1.8s' }, { c: BP, p: 'M-20 117 L185 117 L440 170', b: '2.7s' }];
    spec.forEach(function (s) {
      var g = svgEl('g', {}, [svgEl('circle', { cx: 0, cy: 0, r: 5, fill: s.c })]);
      g.appendChild(motion(s.p, '3.6s', s.b));
      svg.appendChild(g);
    });
    svg.appendChild(txt(260, 215, '相似度 ≥ 阈值 → 直接返回缓存，跳过模型调用', 9, MUTE));
    shell(host, '语义缓存（Semantic Cache）', '相似提示词走缓存，新提示词调用模型', svg,
      'L1 语义缓存为每条提示词生成嵌入向量（Embedding），再与历史条目比较相似度。近乎重复的查询（蓝色）直接从缓存返回，速度快且成本接近零；新提示词（橙色）未命中后才进入 LLM 冷路径。命中率从开放聊天的约 10% 到结构化常见问题（FAQ）的约 70% 不等；前缀中含动态文本时，命中率会降至接近零。');
  }

  // ── edge-bandwidth-pipe: 词元（Tokens）通过狭窄移动端管道与宽 HBM 管道的对比 ──
  // 12-edge-inference
  function edgeBandwidthPipe(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 数据中心（Datacenter）：管道宽，词元多
    svg.appendChild(txt(120, 36, '数据中心 HBM3 · 约 3 TB/s', 9, BP));
    svg.appendChild(svgEl('rect', { x: 40, y: 50, width: 160, height: 44, rx: 4, fill: 'none', stroke: BP, 'stroke-width': 2 }));
    svg.appendChild(txt(245, 75, '→ 约 830 词元/秒', 9, BP, 'start'));
    var i;
    for (i = 0; i < 8; i++) {
      var d = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: BP });
      d.appendChild(motion('M40 72 L200 72', '0.9s', (i * 0.11) + 's'));
      svg.appendChild(d);
    }
    // 边缘端（Edge）：管道窄，少量词元缓慢通过
    svg.appendChild(txt(120, 130, '移动端 DRAM · 约 50–90 GB/s', 9, WARN));
    svg.appendChild(svgEl('rect', { x: 90, y: 150, width: 60, height: 14, rx: 3, fill: 'none', stroke: WARN, 'stroke-width': 2 }));
    svg.appendChild(txt(245, 162, '→ 约 14–25 词元/秒', 9, WARN, 'start'));
    for (i = 0; i < 3; i++) {
      var s = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: WARN });
      s.appendChild(motion('M90 157 L150 157', '1.6s', (i * 0.6) + 's'));
      svg.appendChild(s);
    }
    svg.appendChild(txt(260, 205, '解码每个词元都读取全部权重，带宽决定上限', 9, MUTE));
    svg.appendChild(txt(260, 221, '算力居于其次，通道宽度决定词元生成速率', 9, MUTE));
    shell(host, '边缘端带宽上限（Edge Bandwidth Ceiling）', '数据中心通道宽，移动端通道窄', svg,
      '解码每个词元都要读取全部权重，因此性能上限由内存带宽决定，而非算力。数据中心 HBM3 接近 3 TB/s，可在约一毫秒内读取权重，实现每秒数百词元。移动端 DRAM 只有 50–90 GB/s，带宽窄了约 30–50 倍；同一个模型只能输出每秒 14–25 词元，无论神经网络处理器（Neural Processing Unit，NPU）还有多少闲置算力。');
  }

  // ── load-pattern-waves: 稳定（Steady）/爬升（Ramp）/尖峰（Spike）/持续浸泡（Soak）请求波形 ──
  // 22-load-testing-llm-apis
  function loadPatternWaves(host) {
    var state = { pat: 'spike' };
    var W = 520, H = 230, PAD = 36;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var dur = 6;
    function shape(pat) {
      // 整个周期内采样的条形高度值 (0..1)，以及一个服务器标签
      if (pat === 'steady') return { h: '0.55;0.55;0.55;0.55;0.55', note: '恒定速率：测量基线吞吐量' };
      if (pat === 'ramp') return { h: '0.1;0.35;0.6;0.85;1', note: '逐步增加负载：寻找系统极限' };
      if (pat === 'spike') return { h: '0.2;0.2;1;1;0.2', note: '负载突然激增：测试自动扩缩容反应' };
      return { h: '0.6;0.6;0.6;0.6;0.6', note: '持续数小时：暴露内存泄漏（耐久测试）' };
    }
    var note = txt(260, 215, '', 9, MUTE);
    var bars = svgEl('g', {});
    var sat = txt(260, 36, '', 10, BP);
    function build() {
      while (bars.firstChild) bars.removeChild(bars.firstChild);
      var sp = shape(state.pat);
      var hv = sp.h.split(';');
      var n = 14, i;
      for (i = 0; i < n; i++) {
        var bx = PAD + i * ((W - 2 * PAD) / n) + 3;
        var bw = (W - 2 * PAD) / n - 6;
        // 每根条形的相位偏移（Phase offset），让波形从左向右移动
        var off = (i / n) * dur;
        var b = svgEl('rect', { x: bx, y: H - PAD, width: bw, height: 4, fill: i % 2 ? BP : MUTE, opacity: 0.85 });
        // 将高度缩放为像素，最大约 140
        var hpx = hv.map(function (v) { return (Number(v) * 140).toFixed(0); }).join(';');
        var ypx = hv.map(function (v) { return (H - PAD - Number(v) * 140).toFixed(0); }).join(';');
        b.appendChild(svgEl('animate', { attributeName: 'height', values: hpx, dur: dur + 's', repeatCount: 'indefinite', begin: (-off) + 's' }));
        b.appendChild(svgEl('animate', { attributeName: 'y', values: ypx, dur: dur + 's', repeatCount: 'indefinite', begin: (-off) + 's' }));
        bars.appendChild(b);
      }
      note.textContent = sp.note;
      sat.textContent = ({steady: '稳态（Steady-State）', ramp: '递增（Ramp）', spike: '突发（Spike）', soak: '耐久（Soak）'})[state.pat] + '负载';
    }
    svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: SOFT, 'stroke-width': 1 }));
    svg.appendChild(bars);
    svg.appendChild(sat);
    svg.appendChild(note);
    state._render = build;
    var ctrl = select(state, 'pat', '负载模式（Load Pattern）', [['突发（Spike）', 'spike'], ['稳态（Steady-State）', 'steady'], ['递增（Ramp）', 'ramp'], ['耐久（Soak）', 'soak']]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['负载模式（Load Patterns）']), el('span', {}, ['选择一种模式'])]),
      el('div', { class: 'lf-body' }, [el('div', {}, [ctrl]), el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, ['四种负载形态揭示不同故障。稳态测试（Steady-State）测量基线吞吐量；递增测试（Ramp）逐步加压直到系统极限；突发测试（Spike）用突然激增的流量测试自动扩缩容（Autoscaling）的响应速度；耐久测试（Soak）持续施压数小时以暴露内存泄漏。若每个请求都相同，通用压测工具也会给出误导结果；真实流量需要不同的输入长度和多样化前缀。'])
    ]));
    build();
  }

  LF.register({
    'cache-aware-router': cacheAwareRouter,
    'cold-start-pipeline': coldStartLayers,
    'model-cascade-router': modelCascadeRouter,
    'prefill-decode-split': prefillDecodeSplit,
    'batch-lane-triage': batchLaneTriage,
    'semantic-cache-hit': semanticCacheHit,
    'edge-bandwidth-pipe': edgeBandwidthPipe,
    'load-pattern-waves': loadPatternWaves
  });
})();
