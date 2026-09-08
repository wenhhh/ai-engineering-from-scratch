/* figures-systems3.js — 阶段 6（语音/音频（Speech/audio））、
   阶段 8（生成式 AI（Generative AI））、阶段 11（大语言模型工程（LLM engineering））、阶段 12（多模态（Multimodal））
   及阶段 13（工具与协议（Tools & protocols））的动画课程图表。在 lesson-figures.js 之后加载，使用
   共享 LF 工具包，通过 LF.register 注册。这些 SVG 使用 SMIL 动画：
   <animate>/<animateTransform>/<animateMotion>/stroke-dashoffset 驱动
   动态效果，不使用 JS 渲染循环。无依赖，仅使用 ES5，主题由 CSS 变量控制。编写时
   仍在 docs/en.md 中使用相同的 ```figure 围栏块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  // 卡片外壳（Card shell）包含 SVG 和说明。H 是 SVG 的 viewBox 高度。
  function shell(host, label, hint, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function newSvg(H) { return svgEl('svg', { viewBox: '0 0 520 ' + H }); }
  var BP = 'var(--blueprint,#3553ff)', MUTE = 'var(--ink-mute,#999)', SOFT = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)', INK = 'var(--ink-soft,#555)';
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function aTransform(type, vals, dur, extra) {
    var a = { attributeName: 'transform', type: type, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animateTransform', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    return svgEl('text', { x: x, y: y, 'font-size': size || 10, 'font-family': 'monospace', fill: fill || INK, 'text-anchor': anchor || 'start' }, [document.createTextNode(s)]);
  }

  // ── masked-diffusion-unmask (Show-o): 掩码网格（Masked grid）随步骤推进逐渐填满 ──
  function maskedDiffusion(host) {
    var svg = newSvg(240);
    var n = 6, cell = 26, ox = 150, oy = 26;
    // 确定性的解除掩码（Unmask）顺序，类似置信度螺旋；36 个单元分 9 波显示
    var order = [14, 15, 20, 21, 13, 16, 19, 22, 8, 9, 10, 11, 26, 27, 28, 29, 7, 12, 25, 30, 2, 3, 4, 5, 1, 6, 24, 31, 0, 17, 18, 23, 32, 33, 34, 35];
    var WAVES = 6, total = n * n, per = total / WAVES, cyc = 6; // 秒
    for (var i = 0; i < total; i++) {
      var r = Math.floor(i / n), c = i % n;
      var wave = Math.floor(order.indexOf(i) / per);
      var begin = (wave / WAVES * cyc).toFixed(2) + 's';
      var g = svgEl('g', {});
      // 被掩码的方块（灰色）淡出，内容方块（蓝色）淡入
      g.appendChild(svgEl('rect', { x: ox + c * cell, y: oy + r * cell, width: cell - 2, height: cell - 2, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '0.5' }, [
        anim('fill-opacity', '1;1;0;0', cyc + 's', { keyTimes: '0;' + (wave / WAVES).toFixed(3) + ';' + ((wave + 0.7) / WAVES).toFixed(3) + ';1' })
      ]));
      g.appendChild(svgEl('rect', { x: ox + c * cell, y: oy + r * cell, width: cell - 2, height: cell - 2, fill: BP, 'fill-opacity': '0', stroke: SOFT, 'stroke-width': '0.5' }, [
        anim('fill-opacity', '0;0;' + (0.3 + 0.5 * ((r + c) % 2)).toFixed(2) + ';' + (0.3 + 0.5 * ((r + c) % 2)).toFixed(2), cyc + 's', { keyTimes: '0;' + (wave / WAVES).toFixed(3) + ';' + ((wave + 0.7) / WAVES).toFixed(3) + ';1' })
      ]));
      svg.appendChild(g);
    }
    svg.appendChild(txt(20, 40, '文本：', 11, INK));
    // 左侧文本词元流，从左向右生成，遵循因果顺序（Causal）
    for (var t = 0; t < 5; t++) {
      svg.appendChild(svgEl('rect', { x: 20, y: 56 + t * 26, width: 100, height: 18, rx: 2, fill: BP, 'fill-opacity': '0' }, [
        anim('fill-opacity', '0;0.7;0.7', '6s', { keyTimes: '0;' + (t / 8 + 0.02).toFixed(3) + ';1' })
      ]));
    }
    svg.appendChild(txt(ox, oy - 8, '图像：并行恢复掩码区域', 10, MUTE));
    svg.appendChild(txt(20, 200, '因果 NTP', 10, MUTE));
    shell(host, 'Show-o 统一模型（Unified Model）', '文本从左到右生成，图像并行解除掩码', svg,
      '文本通过下一词元预测（Next-Token Prediction，NTP）从左到右逐个生成。图像词元最初全部被掩码（Mask）遮蔽，然后并行恢复：每步同时预测所有被遮蔽的格子，保留置信度最高的预测，其余重新掩码。几轮之后整幅图像就被填满，所需步数远少于自回归（Autoregressive）图像解码。');
  }

  // ── any-to-any-stream (MIO): 四种模态（Modality）的词元合并为一条流 ──
  function anyToAny(host) {
    var svg = newSvg(240);
    var mods = [
      { y: 30, label: '文本', col: BP },
      { y: 78, label: '图像', col: WARN },
      { y: 126, label: '语音', col: BP },
      { y: 174, label: '音乐', col: MUTE }
    ];
    var laneX = 24, mergeX = 250, outX = 470;
    // 中间的一个 Transformer 块
    svg.appendChild(svgEl('rect', { x: mergeX, y: 60, width: 90, height: 110, rx: 4, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '1' }));
    svg.appendChild(txt(mergeX + 45, 122, '单个', 11, INK, 'middle'));
    svg.appendChild(txt(mergeX + 45, 138, 'Transformer', 11, INK, 'middle'));
    mods.forEach(function (m, mi) {
      svg.appendChild(txt(laneX, m.y + 4, m.label, 11, m.col));
      // 四个词元方块沿路径流入 Transformer，再流出
      var pIn = 'M ' + (laneX + 56) + ' ' + m.y + ' L ' + (mergeX - 6) + ' ' + (m.y < 100 ? 90 : 140);
      for (var k = 0; k < 3; k++) {
        var sq = svgEl('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, fill: m.col, 'fill-opacity': '0.8' });
        var mo = svgEl('animateMotion', { dur: '3s', repeatCount: 'indefinite', path: pIn, begin: (mi * 0.2 + k * 1).toFixed(2) + 's' });
        sq.appendChild(mo);
        sq.appendChild(anim('fill-opacity', '0;0.85;0', '3s', { begin: (mi * 0.2 + k * 1).toFixed(2) + 's' }));
        svg.appendChild(sq);
      }
    });
    // 输出流：交替模态的词元从同一泳道离开
    var outCols = [BP, WARN, BP, MUTE, BP];
    var pOut = 'M ' + (mergeX + 90) + ' 115 L ' + outX + ' 115';
    for (var o = 0; o < 5; o++) {
      var os = svgEl('rect', { x: -6, y: -6, width: 12, height: 12, rx: 2, fill: outCols[o], 'fill-opacity': '0.85' });
      os.appendChild(svgEl('animateMotion', { dur: '2.5s', repeatCount: 'indefinite', path: pOut, begin: (o * 0.5).toFixed(2) + 's' }));
      os.appendChild(anim('fill-opacity', '0;0.9;0', '2.5s', { begin: (o * 0.5).toFixed(2) + 's' }));
      svg.appendChild(os);
    }
    svg.appendChild(txt(outX - 30, 100, '任意模态输出', 10, MUTE, 'middle'));
    shell(host, '任意模态流（Any-to-Any Stream）', '四种模态 → 一个共享词表', svg,
      '文本、图像、语音和音乐分别词元化（Tokenization）到同一个共享词表（Shared Vocabulary），再交错组成单一序列，由一个因果 Transformer 处理。所有模态都表示为词元，因此模型可以输出任意模态；解码流中不同类型的词元交替出现，以满足对话速度的方式流式输出。');
  }

  // ── video-diffusion-denoise (Sora 风格（Sora-style）): 带噪帧条逐渐清晰 ──
  function videoDenoise(host) {
    var svg = newSvg(220);
    var fw = 90, fh = 64, gap = 10, oy = 40, ox = 16, frames = 5;
    svg.appendChild(txt(ox, 28, '时空块经过 T 步去噪', 10, MUTE));
    for (var f = 0; f < frames; f++) {
      var fx = ox + f * (fw + gap);
      var g = svgEl('g', {});
      // 帧边框
      g.appendChild(svgEl('rect', { x: fx, y: oy, width: fw, height: fh, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
      // 噪声斑点层淡出
      var noise = svgEl('g', {});
      for (var s = 0; s < 10; s++) {
        var nx = fx + 6 + (s * 17 % (fw - 12));
        var ny = oy + 6 + ((s * 23) % (fh - 12));
        noise.appendChild(svgEl('rect', { x: nx, y: ny, width: 6, height: 6, fill: MUTE, 'fill-opacity': '0.7' }));
      }
      noise.appendChild(anim('opacity', '1;0', '5s', { begin: (f * 0.4).toFixed(2) + 's' }));
      g.appendChild(noise);
      // 清晰形状淡入并在帧间移动，以移动球表示时间连贯性（Temporal coherence）
      var cy = oy + fh / 2 + (f - 2) * 4;
      var ball = svgEl('circle', { cx: fx + 20 + f * 12, cy: cy, r: 12, fill: BP, 'fill-opacity': '0' });
      ball.appendChild(anim('fill-opacity', '0;0.8', '5s', { begin: (f * 0.4).toFixed(2) + 's' }));
      g.appendChild(ball);
      svg.appendChild(g);
      if (f < frames - 1) {
        svg.appendChild(svgEl('line', { x1: fx + fw, y1: oy + fh / 2, x2: fx + fw + gap, y2: oy + fh / 2, stroke: SOFT, 'stroke-width': '1', 'stroke-dasharray': '2 2' }));
      }
    }
    svg.appendChild(txt(ox, oy + fh + 24, '第 1 帧', 9, MUTE));
    svg.appendChild(txt(ox + (frames - 1) * (fw + gap), oy + fh + 24, '第 ' + frames + ' 帧', 9, MUTE));
    shell(host, '视频扩散（Video Diffusion）', '噪声 → 连贯运动', svg,
      '三维变分自编码器（3-D VAE）将视频压缩为时空块（Spatiotemporal Patch），再由扩散 Transformer（Diffusion Transformer）去噪。灰色斑点是模型逐步移除的噪声；逐渐清晰并在各帧间移动的蓝色图形表示网络必须建模的时间一致性（Temporal Coherence）：同一物体的外观、光照和运动在整段帧序列中保持一致。');
  }

  // ── inpaint-mask-reinject: 掩码区域（Masked region）重新生成，上下文保持固定 ──
  function inpaint(host) {
    var svg = newSvg(230);
    var ix = 140, iy = 30, iw = 240, ih = 168;
    // 外围图像，即保留的上下文，使用柔和填充
    svg.appendChild(svgEl('rect', { x: ix, y: iy, width: iw, height: ih, fill: BP, 'fill-opacity': '0.14', stroke: SOFT, 'stroke-width': '1' }));
    svg.appendChild(txt(ix + 8, iy + 18, '保留上下文（每步重新注入）', 10, INK));
    // 掩码区域
    var mx = ix + 70, my = iy + 56, mw = 100, mh = 84;
    var maskRect = svgEl('rect', { x: mx, y: my, width: mw, height: mh, fill: 'var(--bg-surface,#eee)', stroke: WARN, 'stroke-width': '1.5', 'stroke-dasharray': '5 3' });
    svg.appendChild(maskRect);
    // 虚线沿掩码边界移动
    svg.appendChild(svgEl('rect', { x: mx, y: my, width: mw, height: mh, fill: 'none', stroke: WARN, 'stroke-width': '1.5', 'stroke-dasharray': '5 3' }, [
      anim('stroke-dashoffset', '0;-16', '1s')
    ]));
    // 掩码内重新生成的内容：噪声淡变为干净的蓝色填充
    var noise = svgEl('g', {});
    for (var s = 0; s < 12; s++) {
      noise.appendChild(svgEl('rect', { x: mx + 6 + (s * 13 % (mw - 12)), y: my + 6 + ((s * 19) % (mh - 12)), width: 7, height: 7, fill: MUTE, 'fill-opacity': '0.7' }));
    }
    noise.appendChild(anim('opacity', '1;1;0;0', '4s', { keyTimes: '0;0.15;0.75;1' }));
    svg.appendChild(noise);
    var fill = svgEl('rect', { x: mx + 4, y: my + 4, width: mw - 8, height: mh - 8, fill: BP, 'fill-opacity': '0' }, [
      anim('fill-opacity', '0;0;0.7;0.7', '4s', { keyTimes: '0;0.15;0.75;1' })
    ]);
    svg.appendChild(fill);
    svg.appendChild(txt(mx + mw / 2, my + mh + 18, '仅在此区域重新生成', 10, WARN, 'middle'));
    // 侧边标签
    svg.appendChild(txt(18, 110, '仅在', 11, INK));
    svg.appendChild(txt(18, 126, '掩码内', 11, INK));
    svg.appendChild(txt(18, 142, '去噪', 11, INK));
    shell(host, '局部重绘（Inpainting）', '掩码内去噪，其余区域保持不变', svg,
      '局部重绘（Inpainting）只对掩码区域去噪，并在每步重新注入已知像素，以保持边界一致。移动虚线表示掩码边界；内部噪声逐渐变为新内容，周围上下文保持固定，像素完全不变。');
  }

  // ── agentic-rag-loop: 检索（Retrieve）→ 推理（Reason）→ 行动（Act）循环 ──
  function agenticRag(host) {
    var svg = newSvg(240);
    var cx = 260, cy = 128, R = 78;
    var nodes = [
      { a: -90, label: '检索', col: BP },
      { a: 30, label: '推理', col: WARN },
      { a: 150, label: '行动/改进', col: BP }
    ];
    // 环形箭头轨道
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: SOFT, 'stroke-width': '1.5', 'stroke-dasharray': '6 6' }, [
      anim('stroke-dashoffset', '0;-48', '2s')
    ]));
    var pos = [];
    nodes.forEach(function (nd) {
      var rad = nd.a * Math.PI / 180;
      var x = cx + R * Math.cos(rad), y = cy + R * Math.sin(rad);
      pos.push([x, y]);
      svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 30, fill: nd.col, 'fill-opacity': '0.18', stroke: nd.col, 'stroke-width': '1.5' }, [
        anim('stroke-opacity', '0.3;1;0.3', '6s', { begin: (nodes.indexOf(nd) * 2).toFixed(1) + 's' })
      ]));
      svg.appendChild(txt(x, y + 4, nd.label, 10, INK, 'middle'));
    });
    // 查询词元沿循环轨道运行
    var orbit = 'M ' + pos[0][0] + ' ' + pos[0][1] + ' A ' + R + ' ' + R + ' 0 0 1 ' + pos[1][0] + ' ' + pos[1][1] +
      ' A ' + R + ' ' + R + ' 0 0 1 ' + pos[2][0] + ' ' + pos[2][1] +
      ' A ' + R + ' ' + R + ' 0 0 1 ' + pos[0][0] + ' ' + pos[0][1];
    var tok = svgEl('circle', { r: 7, fill: WARN });
    tok.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: orbit, rotate: 'auto' }));
    svg.appendChild(tok);
    // 左侧语料库（Corpus）向检索环节提供内容
    svg.appendChild(txt(30, 60, '语料库', 10, MUTE));
    for (var d = 0; d < 4; d++) {
      svg.appendChild(svgEl('rect', { x: 30, y: 70 + d * 18, width: 60, height: 12, rx: 1, fill: BP, 'fill-opacity': (0.25 + d * 0.12).toFixed(2) }));
    }
    svg.appendChild(txt(cx, 12, '循环检索与推理，直到答案有充分依据', 10, MUTE, 'middle'));
    shell(host, '智能体式检索增强生成（Agentic RAG）', '检索 → 推理 → 行动 → 重复', svg,
      '基础检索增强生成（Retrieval-Augmented Generation，RAG）只检索一次便作答。智能体式 RAG 则循环执行：检索候选内容，判断其是否真正回答了查询，再采取行动，例如改写查询、重排序（Reranking）或再次检索。沿圆环运动的词元表示一条查询反复迭代，直到上下文足以支持回答；多跳问题（Multi-Hop Question）正需要这种能力。');
  }

  // ── mcp-nxm-collapse: N 个宿主（Hosts）× M 个服务器（Servers）→ 一个协议枢纽（Protocol hub） ──
  function mcpMatrix(host) {
    var svg = newSvg(250);
    var hosts = ['Claude', 'ChatGPT', 'Cursor'];
    var servers = ['数据库', '日历', '文件'];
    var hubX = 260, hubY = 125;
    // 枢纽（Hub）
    svg.appendChild(svgEl('circle', { cx: hubX, cy: hubY, r: 26, fill: BP, 'fill-opacity': '0.18', stroke: BP, 'stroke-width': '1.5' }));
    svg.appendChild(txt(hubX, hubY + 4, 'MCP', 11, BP, 'middle'));
    var hy = [50, 125, 200], sy = [50, 125, 200];
    hosts.forEach(function (h, i) {
      var hx = 40;
      svg.appendChild(svgEl('rect', { x: hx, y: hy[i] - 14, width: 76, height: 28, rx: 3, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '1' }));
      svg.appendChild(txt(hx + 38, hy[i] + 4, h, 10, INK, 'middle'));
      svg.appendChild(svgEl('line', { x1: hx + 76, y1: hy[i], x2: hubX - 26, y2: hubY, stroke: SOFT, 'stroke-width': '1', 'stroke-dasharray': '5 4' }, [
        anim('stroke-dashoffset', '0;-18', '1.2s', { begin: (i * 0.3).toFixed(1) + 's' })
      ]));
      // 请求数据包：宿主 → 枢纽
      var pkt = svgEl('circle', { r: 5, fill: BP });
      pkt.appendChild(svgEl('animateMotion', { dur: '2.4s', repeatCount: 'indefinite', path: 'M ' + (hx + 76) + ' ' + hy[i] + ' L ' + (hubX - 26) + ' ' + hubY, begin: (i * 0.4).toFixed(1) + 's' }));
      pkt.appendChild(anim('opacity', '0;1;0', '2.4s', { begin: (i * 0.4).toFixed(1) + 's' }));
      svg.appendChild(pkt);
    });
    servers.forEach(function (sv, i) {
      var sx = 404;
      svg.appendChild(svgEl('rect', { x: sx, y: sy[i] - 14, width: 76, height: 28, rx: 3, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '1' }));
      svg.appendChild(txt(sx + 38, sy[i] + 4, sv, 10, INK, 'middle'));
      svg.appendChild(svgEl('line', { x1: hubX + 26, y1: hubY, x2: sx, y2: sy[i], stroke: SOFT, 'stroke-width': '1', 'stroke-dasharray': '5 4' }, [
        anim('stroke-dashoffset', '0;-18', '1.2s', { begin: (i * 0.3 + 0.6).toFixed(1) + 's' })
      ]));
      var pkt2 = svgEl('circle', { r: 5, fill: WARN });
      pkt2.appendChild(svgEl('animateMotion', { dur: '2.4s', repeatCount: 'indefinite', path: 'M ' + (hubX + 26) + ' ' + hubY + ' L ' + sx + ' ' + sy[i], begin: (i * 0.4 + 1).toFixed(1) + 's' }));
      pkt2.appendChild(anim('opacity', '0;1;0', '2.4s', { begin: (i * 0.4 + 1).toFixed(1) + 's' }));
      svg.appendChild(pkt2);
    });
    svg.appendChild(txt(40, 232, 'N 个宿主', 10, MUTE));
    svg.appendChild(txt(404, 232, 'M 个服务器', 10, MUTE));
    shell(host, 'MCP 简化 N×M 集成', '一套协议连接所有宿主与服务器', svg,
      'MCP 出现之前，每个宿主（Host）与服务器（Server）都要通过定制协议集成，形成 N×M 的集成矩阵。模型上下文协议（Model Context Protocol，MCP）提供统一的 JSON-RPC 规范：编写一个服务器，任何兼容宿主都能发现并调用其中的工具（Tool）、资源（Resource）和提示词（Prompt）。请求与结果使用同一套线上消息格式往返传输。');
  }

  // ── a2a-task-lifecycle: 智能体发送 Task，状态推进，交付物（Artifact）返回 ──
  function a2aLifecycle(host) {
    var svg = newSvg(240);
    var states = ['submitted', 'working', 'input-required', 'completed'];
    var sx = 150, dx = 92, sy = 70;
    // 客户端与远程智能体方框
    svg.appendChild(svgEl('rect', { x: 20, y: 30, width: 90, height: 36, rx: 4, fill: BP, 'fill-opacity': '0.16', stroke: BP, 'stroke-width': '1.5' }));
    svg.appendChild(txt(65, 52, '客户端智能体', 10, INK, 'middle'));
    svg.appendChild(svgEl('rect', { x: 410, y: 30, width: 90, height: 36, rx: 4, fill: WARN, 'fill-opacity': '0.16', stroke: WARN, 'stroke-width': '1.5' }));
    svg.appendChild(txt(455, 52, '远端智能体', 10, INK, 'middle'));
    // 任务消息从客户端飞向远程智能体
    var task = svgEl('rect', { x: -16, y: -8, width: 32, height: 16, rx: 3, fill: BP });
    task.appendChild(svgEl('animateMotion', { dur: '8s', repeatCount: 'indefinite', path: 'M 110 48 L 410 48', keyTimes: '0;0.12;1', keyPoints: '0;1;1', calcMode: 'linear' }));
    task.appendChild(anim('opacity', '0;1;1;0;0', '8s', { keyTimes: '0;0.02;0.1;0.14;1' }));
    svg.appendChild(task);
    svg.appendChild(svgEl('text', { x: 0, y: 4, 'font-size': 8, 'font-family': 'monospace', fill: 'var(--bg,#fff)', 'text-anchor': 'middle' }, [document.createTextNode('Task'),
      svgEl('animateMotion', { dur: '8s', repeatCount: 'indefinite', path: 'M 110 48 L 410 48', keyTimes: '0;0.12;1', keyPoints: '0;1;1', calcMode: 'linear' }),
      anim('opacity', '0;1;1;0;0', '8s', { keyTimes: '0;0.02;0.1;0.14;1' })]));
    // 状态胶囊标签依次点亮
    states.forEach(function (st, i) {
      var x = sx + i * dx;
      svg.appendChild(svgEl('rect', { x: x - 42, y: 120, width: 84, height: 26, rx: 13, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '1' }));
      svg.appendChild(svgEl('rect', { x: x - 42, y: 120, width: 84, height: 26, rx: 13, fill: BP, 'fill-opacity': '0' }, [
        anim('fill-opacity', '0;0.85;0.85;0', '8s', { keyTimes: '0;' + (0.15 + i * 0.2).toFixed(2) + ';' + (0.32 + i * 0.2).toFixed(2) + ';1' })
      ]));
      svg.appendChild(txt(x, 137, st, 9, INK, 'middle'));
      if (i < states.length - 1) {
        svg.appendChild(svgEl('line', { x1: x + 42, y1: 133, x2: x + dx - 42, y2: 133, stroke: SOFT, 'stroke-width': '1' }));
      }
    });
    // 最后交付物从远程智能体返回客户端
    var art = svgEl('rect', { x: -18, y: -9, width: 36, height: 18, rx: 3, fill: WARN });
    art.appendChild(svgEl('animateMotion', { dur: '8s', repeatCount: 'indefinite', path: 'M 410 190 L 110 190', keyTimes: '0;0.86;0.98;1', keyPoints: '0;0;1;1', calcMode: 'linear' }));
    art.appendChild(anim('opacity', '0;0;1;0', '8s', { keyTimes: '0;0.86;0.94;1' }));
    svg.appendChild(art);
    svg.appendChild(txt(260, 215, '产物（Artifact）', 9, WARN, 'middle'));
    svg.appendChild(txt(260, 100, '任务生命周期（内部状态对调用者不透明）', 10, MUTE, 'middle'));
    shell(host, 'A2A 任务生命周期（Task Lifecycle）', '已提交 → 处理中 → 已完成', svg,
      '在智能体间协议（Agent-to-Agent，A2A）中，一个智能体向另一个发送任务（Task），只观察状态转移：已提交（submitted）、处理中（working）、有时需要输入（input-required），最终已完成（completed）。远端智能体的内部推理对调用者不透明；调用者只能看到状态变化，以及最后返回的输出产物（Artifact）。');
  }

  // ── rvq-codec-cascade: 残差向量量化（Residual vector quantization），比较语义与声学表示 ──
  function rvqCodec(host) {
    var svg = newSvg(230);
    // 左侧波形输入编码器（Encoder）
    var wd = 'M 24 120', wx;
    for (wx = 0; wx <= 80; wx++) {
      var xx = 24 + wx, yy = 120 + 26 * Math.sin(wx / 4) * Math.exp(-wx / 120);
      wd += ' L ' + xx + ' ' + yy.toFixed(1);
    }
    svg.appendChild(svgEl('path', { d: wd, fill: 'none', stroke: MUTE, 'stroke-width': '1.5' }));
    svg.appendChild(txt(24, 60, '波形', 10, MUTE));
    // 编码器方块
    svg.appendChild(svgEl('rect', { x: 116, y: 96, width: 30, height: 48, rx: 3, fill: 'var(--bg-surface,#eee)', stroke: SOFT, 'stroke-width': '1' }));
    svg.appendChild(txt(131, 124, '编码', 9, INK, 'middle'));
    // 级联码本（Codebooks）；残差沿堆栈向下逐渐缩小
    var books = [
      { y: 30, label: 'CB0  语义', col: BP, amp: 1.0 },
      { y: 78, label: 'CB1  声学', col: WARN, amp: 0.55 },
      { y: 126, label: 'CB2  声学', col: WARN, amp: 0.32 },
      { y: 174, label: 'CB3  声学', col: WARN, amp: 0.18 }
    ];
    books.forEach(function (b, i) {
      var bx = 200;
      svg.appendChild(svgEl('rect', { x: bx, y: b.y, width: 150, height: 30, rx: 3, fill: b.col, 'fill-opacity': '0.12', stroke: b.col, 'stroke-width': '1' }));
      svg.appendChild(txt(bx + 8, b.y + 19, b.label, 10, INK));
      // 残差（Residual）条缩短，以宽度脉动动画展示“还剩多少需要量化”
      svg.appendChild(svgEl('rect', { x: bx + 100, y: b.y + 8, width: 40 * b.amp, height: 14, rx: 2, fill: b.col, 'fill-opacity': '0.7' }, [
        anim('fill-opacity', '0.3;0.8;0.3', '3s', { begin: (i * 0.4).toFixed(1) + 's' })
      ]));
      // 残差数据包从一个码本流向下一个码本
      if (i < books.length - 1) {
        var pk = svgEl('circle', { r: 4, fill: b.col });
        pk.appendChild(svgEl('animateMotion', { dur: '3s', repeatCount: 'indefinite', path: 'M ' + (bx + 75) + ' ' + (b.y + 30) + ' L ' + (bx + 75) + ' ' + books[i + 1].y, begin: (i * 0.5).toFixed(1) + 's' }));
        pk.appendChild(anim('opacity', '0;1;0', '3s', { begin: (i * 0.5).toFixed(1) + 's' }));
        svg.appendChild(pk);
      }
      // 编码器 → 第一个码本的连接
      if (i === 0) {
        svg.appendChild(svgEl('line', { x1: 146, y1: 120, x2: bx, y2: b.y + 15, stroke: SOFT, 'stroke-width': '1', 'stroke-dasharray': '4 3' }, [
          anim('stroke-dashoffset', '0;-14', '1s')
        ]));
      }
    });
    svg.appendChild(txt(200, 220, '每个码本量化上一级留下的残差', 10, MUTE));
    shell(host, '残差向量量化音频编解码器（RVQ Audio Codec）', '码本 0 编码语义，码本 1..N 编码声学信息', svg,
      '神经音频编解码器（Neural Audio Codec）使用多个小码本（Codebook，CB）级联，而非单个巨大码本：第一个量化编码器输出，后续各级量化前一级留下的残差（Residual）。逐渐缩短的条形表示残差沿级联不断减小。残差向量量化（Residual Vector Quantization，RVQ）中，让码本 0 承载语言内容，即语义（Semantic）信息，其余码本承载声学（Acoustic）细节，使基于词元的语音模型能够工作。');
  }

  LF.register({
    'masked-diffusion-unmask': maskedDiffusion,
    'any-to-any-stream': anyToAny,
    'video-diffusion-denoise': videoDenoise,
    'inpaint-mask-reinject': inpaint,
    'agentic-rag-loop': agenticRag,
    'mcp-nxm-collapse': mcpMatrix,
    'a2a-task-lifecycle': a2aLifecycle,
    'rvq-codec-cascade': rvqCodec
  });
})();
