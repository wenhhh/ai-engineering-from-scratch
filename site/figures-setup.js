/* figures-setup.js：阶段 00（设置与工具（Setup and tooling））的动画课程图表，
   涵盖开发环境（Dev environments）、Git、GPU、密钥、笔记本（Notebooks）、环境、Docker、编辑器、数据、
   Shell、Linux 与性能剖析（Profiling）。在 lesson-figures.js 之后加载，通过
   window.LF.register 注册。原生 ES5，无依赖，主题由 CSS 变量控制。动画
   仅使用 SMIL（animate / animateMotion / animateTransform）。编写时仍使用
   相同的围栏块：
       ```figure
       s0-commit-dag
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var MUTE = 'var(--ink-mute,#777)';
  var INKS = 'var(--ink-soft,#555)';
  var WARN = 'var(--warn,#b8870f)';
  var INK = 'var(--ink,#1a1a1a)';
  var BG = 'var(--bg,#fafaf5)';
  var SURF = 'var(--bg-surface,#eee)';
  var EASE = '0.23 1 0.32 1';

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function box(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: 3, fill: fill || 'none', stroke: stroke || SOFT, 'stroke-width': 1.4 });
  }
  function txt(x, y, s, size, fill, anchor) {
    return svgEl('text', { x: x, y: y, 'font-family': 'var(--font-mono,monospace)', 'font-size': size || 11, fill: fill || MUTE, 'text-anchor': anchor || 'middle' }, [document.createTextNode(s)]);
  }
  function grp(x, y, kids) {
    var g = svgEl('g', { transform: 'translate(' + x + ' ' + y + ')' });
    (kids || []).forEach(function (k) { g.appendChild(k); });
    return g;
  }
  // 入场（Entry）：淡入并从 95% 放大，保持，退场比入场更快，共用循环。
  // `at` 表示入场开始时间，占 `dur` 的比例。
  function pop(g, dur, at) {
    var kt = '0;' + at + ';' + (at + 0.08) + ';0.93;1';
    var ks = '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1';
    g.setAttribute('opacity', '0');
    g.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: kt, dur: dur, repeatCount: 'indefinite', calcMode: 'spline', keySplines: ks }));
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;0.95;1;1;0.95', keyTimes: kt, dur: dur, repeatCount: 'indefinite', calcMode: 'spline', keySplines: ks }));
    return g;
  }
  // 边在 `at` 时逐渐绘出，在循环结束时快速擦除。
  function wire(x1, y1, x2, y2, dur, at, len, col) {
    var L = len || 300;
    var p = svgEl('path', { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, fill: 'none', stroke: col || INKS, 'stroke-width': 1.5, 'stroke-dasharray': L + ' ' + L, 'stroke-dashoffset': L });
    p.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: L + ';' + L + ';0;0;' + L, keyTimes: '0;' + at + ';' + (at + 0.07) + ';0.93;1', dur: dur, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    return p;
  }
  // 路径上的分时段移动（Windowed travel）：隐藏、出现、在 a..b 移动、再次隐藏。
  function travel(node, path, dur, a, b) {
    node.setAttribute('opacity', '0');
    node.appendChild(svgEl('animateMotion', { path: path, dur: dur, repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;' + a + ';' + b + ';1' }));
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0;0', keyTimes: '0;' + a + ';' + (a + 0.02) + ';' + (b - 0.02) + ';' + b + ';1', dur: dur, repeatCount: 'indefinite' }));
    return node;
  }

  // ── s0-env-stack: 四层开发栈（Dev stack）自下而上组装 ──
  // 01-dev-environment
  function envStack(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '5.5s';
    var layers = [
      { y: 208, t: '1 · 系统（System）', s: 'OS、驱动、CUDA / Metal', at: 0.04 },
      { y: 166, t: '2 · 包管理器', s: 'uv, pnpm, cargo', at: 0.13 },
      { y: 124, t: '3 · 语言运行时', s: 'Python 3.11+, Node 20+, Rust', at: 0.22 },
      { y: 82, t: '4 · AI 库', s: 'torch, jax, transformers', at: 0.31 }
    ];
    layers.forEach(function (L, i) {
      svg.appendChild(pop(grp(260, L.y, [
        box(-160, -17, 320, 34, i === 3 ? SURF : BG, i === 3 ? BP : INKS),
        txt(-148, 4, L.t, 10, i === 3 ? BP : INK, 'start'),
        txt(148, 4, L.s, 9, MUTE, 'end')
      ]), D, L.at));
    });
    svg.appendChild(pop(grp(260, 42, [
      txt(0, 0, 'python -c "import torch"  ·  成功', 10, BP)
    ]), D, 0.5));
    svg.appendChild(txt(260, 242, '每一层都依赖其下方的层', 9, MUTE));
    shell(host, '四层环境栈（Four-layer Stack）', '依次配置系统、包管理器、运行时和库', svg,
      '开发环境自底向上搭建：先配置操作系统（OS）和 GPU 驱动，再安装包管理器（Package Manager）、语言运行时（Language Runtime），最后安装依赖前三层的 AI 库。import torch 失败时，应沿环境栈向下排查；真正出问题的层几乎总不是抛出错误的那一层。');
  }

  // ── s0-commit-dag: 提交有向无环图（Commit DAG）增长，分支合并回 main ──
  // 02-git-and-collaboration
  function commitDag(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 210' });
    var D = '6s';
    function commit(x, y, at, hot) {
      return pop(grp(x, y, [
        svgEl('circle', { cx: 0, cy: 0, r: 9, fill: hot ? SURF : BG, stroke: hot ? BP : INK, 'stroke-width': 1.6 })
      ]), D, at);
    }
    svg.appendChild(txt(46, 149, 'main', 9, MUTE, 'end'));
    svg.appendChild(txt(285, 58, 'feature/lr-sweep', 9, MUTE));
    svg.appendChild(wire(99, 145, 161, 145, D, 0.1, 70));
    svg.appendChild(wire(179, 145, 251, 145, D, 0.2, 80));
    svg.appendChild(wire(177, 138, 243, 87, D, 0.3, 90, BP));
    svg.appendChild(wire(259, 80, 311, 80, D, 0.4, 60, BP));
    svg.appendChild(wire(269, 145, 391, 145, D, 0.52, 130));
    svg.appendChild(wire(327, 87, 393, 138, D, 0.6, 90, BP));
    svg.appendChild(commit(90, 145, 0.05));
    svg.appendChild(commit(170, 145, 0.15));
    svg.appendChild(commit(260, 145, 0.25));
    svg.appendChild(commit(250, 80, 0.35, true));
    svg.appendChild(commit(320, 80, 0.45, true));
    svg.appendChild(commit(400, 145, 0.68, true));
    svg.appendChild(pop(grp(400, 175, [txt(0, 0, '合并提交（Merge Commit）', 9, BP)]), D, 0.72));
    svg.appendChild(txt(260, 200, '在分支上实验，验证成功后再合并', 9, MUTE));
    shell(host, '提交有向无环图（Commit DAG）', 'main 继续前进，分支独立发展后再合回', svg,
      '每个提交（Commit）都指向其父提交，因此历史构成一张图，而非一个列表。分支（Branch）是一条分叉的提交路径：main 继续前进，实验沿自己的路径发展，合并提交（Merge Commit）则连接两个父提交。因此，你可以尝试有风险的改动，同时不触碰 main。');
  }

  // ── s0-gpu-dispatch: 同一批矩阵乘法（Matmul）在 CPU 与 GPU 泳道上的对比 ──
  // 03-gpu-setup-and-cloud
  function gpuDispatch(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '6s';
    svg.appendChild(pop(grp(75, 115, [
      box(-48, -24, 96, 48, BG, INK),
      txt(0, -3, '矩阵乘法', 10, INK),
      txt(0, 12, '批次（Batch）', 9, MUTE)
    ]), D, 0.03));
    svg.appendChild(svgEl('path', { d: 'M127 105 L366 70', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    svg.appendChild(svgEl('path', { d: 'M127 125 L366 165', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    var cpuBar = svgEl('rect', { x: -48, y: 6, width: 0, height: 8, fill: MUTE });
    cpuBar.appendChild(svgEl('animate', { attributeName: 'width', values: '0;0;96', keyTimes: '0;0.08;1', dur: D, repeatCount: 'indefinite' }));
    svg.appendChild(pop(grp(430, 70, [
      box(-60, -26, 120, 52, BG, MUTE),
      txt(0, -8, 'CPU', 10, INK),
      svgEl('rect', { x: -48, y: 6, width: 96, height: 8, fill: SURF }),
      cpuBar
    ]), D, 0.08));
    var gpuBar = svgEl('rect', { x: -48, y: 6, width: 0, height: 8, fill: BP });
    gpuBar.appendChild(svgEl('animate', { attributeName: 'width', values: '0;96', dur: '1.2s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: EASE, keyTimes: '0;1' }));
    svg.appendChild(pop(grp(430, 165, [
      box(-60, -26, 120, 52, BG, BP),
      txt(0, -8, 'GPU', 10, BP),
      svgEl('rect', { x: -48, y: 6, width: 96, height: 8, fill: SURF }),
      gpuBar
    ]), D, 0.13));
    var slow = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: MUTE });
    slow.appendChild(svgEl('animateMotion', { path: 'M127 105 L360 70', dur: D, repeatCount: 'indefinite' }));
    svg.appendChild(slow);
    for (var i = 0; i < 4; i++) {
      var d = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BP });
      d.appendChild(svgEl('animateMotion', { path: 'M127 125 L360 165', dur: '1.2s', begin: (i * 0.3) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(d);
    }
    svg.appendChild(txt(430, 112, '一轮（Epoch）：约 8 小时', 9, MUTE));
    svg.appendChild(txt(430, 207, '约 10 分钟 · 48x', 9, BP));
    svg.appendChild(txt(255, 30, '相同任务，两个后端（Backend）', 9, MUTE));
    shell(host, '分派到加速器（Accelerator）', '一条通道由 CPU 缓慢处理，另一条由 GPU 连续处理', svg,
      'GPU 的优势在于，矩阵乘法（Matrix Multiplication）包含数千次独立的乘加运算（Multiply-add），恰好适合由其核心并行执行。同一批次在 CPU 上分块缓慢处理，在 GPU 上却可连续流过，因此 CPU 上需要 8 小时的训练在 T4 上约需 10 分钟。首先确认加速通道可用：先运行 nvidia-smi，再检查 torch.cuda.is_available()。');
  }

  // ── s0-secret-inject: 密钥从 .env 流入请求头（Request header） ──
  // 04-apis-and-keys
  function secretInject(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '6s';
    svg.appendChild(pop(grp(105, 62, [
      box(-80, -28, 160, 56, BG, INKS),
      txt(0, -10, 'app.py（纳入 Git）', 9, INK),
      txt(0, 8, 'key = os.environ[...]', 8, MUTE)
    ]), D, 0.03));
    svg.appendChild(pop(grp(105, 188, [
      box(-80, -26, 160, 52, BG, WARN),
      txt(0, -8, '.env（Git 忽略）', 9, INK),
      txt(0, 9, 'ANTHROPIC_API_KEY=sk-...', 8, WARN)
    ]), D, 0.07));
    svg.appendChild(pop(grp(285, 125, [
      box(-58, -25, 116, 50, BG, INK),
      txt(0, 3, 'Python 进程（Process）', 9, INK)
    ]), D, 0.11));
    svg.appendChild(pop(grp(455, 125, [
      box(-58, -25, 116, 50, BG, BP),
      txt(0, -3, 'api.anthropic', 9, BP),
      txt(0, 11, '.com', 9, BP)
    ]), D, 0.15));
    svg.appendChild(svgEl('path', { d: 'M140 94 L240 112', fill: 'none', stroke: SOFT, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
    var key = grp(0, 0, [
      svgEl('rect', { x: -16, y: -9, width: 32, height: 18, rx: 4, fill: SURF, stroke: WARN, 'stroke-width': 1.4 }),
      txt(0, 4, 'sk', 9, WARN)
    ]);
    travel(key, 'M140 172 L245 138', D, 0.24, 0.36);
    svg.appendChild(key);
    var req = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BP });
    travel(req, 'M345 117 L395 117', D, 0.44, 0.56);
    svg.appendChild(req);
    var res = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BG, stroke: BP, 'stroke-width': 1.5 });
    travel(res, 'M395 134 L345 134', D, 0.62, 0.74);
    svg.appendChild(res);
    svg.appendChild(pop(grp(370, 100, [txt(0, 0, 'Authorization: Bearer sk-...', 8, MUTE)]), D, 0.42));
    svg.appendChild(pop(grp(370, 155, [txt(0, 0, '200 · json', 9, BP)]), D, 0.72));
    svg.appendChild(txt(260, 228, '密钥仅存在于 .env 和运行时请求头中', 9, MUTE));
    shell(host, '密钥注入（Secret Injection）', '运行时从 .env 加载密钥，不写入代码', svg,
      '提交的代码只引用变量名；变量值保存在被 Git 忽略的 .env 文件中，运行时注入进程环境（Process Environment），再通过 Authorization 请求头（Header）发送。密钥一旦出现在源代码中，就会随每一份仓库克隆（Clone）传播；泄露密钥产生的费用会记在你的账户上。');
  }

  // ── s0-cell-order: 单元格（Cells）按顺序运行，直到一次重跑留下陈旧状态（Stale state） ──
  // 05-jupyter-notebooks
  function cellOrder(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    var D = '6s';
    var cells = [
      { y: 55, code: 'df = load("train.csv")' },
      { y: 120, code: 'df = clean(df)' },
      { y: 185, code: 'model.fit(df)' }
    ];
    cells.forEach(function (c) {
      svg.appendChild(box(120, c.y - 22, 330, 44, BG, INKS));
      svg.appendChild(txt(140, c.y + 4, c.code, 10, INK, 'start'));
    });
    svg.appendChild(pop(grp(95, 55, [txt(0, 4, '[1]', 10, BP)]), D, 0.05));
    var b2 = pop(grp(95, 120, [txt(0, 4, '[2]', 10, BP)]), D, 0.15);
    svg.appendChild(b2);
    var hide2 = svgEl('animate', { attributeName: 'opacity', values: '1;1;0;0', keyTimes: '0;0.53;0.56;1', dur: D, repeatCount: 'indefinite' });
    b2.firstChild.appendChild(hide2);
    svg.appendChild(pop(grp(95, 185, [txt(0, 4, '[3]', 10, BP)]), D, 0.25));
    svg.appendChild(pop(grp(95, 120, [txt(0, 4, '[4]', 10, WARN)]), D, 0.56));
    svg.appendChild(pop(grp(285, 185, [box(-165, -22, 330, 44, null, WARN)]), D, 0.64));
    svg.appendChild(pop(grp(400, 152, [txt(0, 0, '使用了旧 df：状态已过期', 9, WARN)]), D, 0.68));
    svg.appendChild(txt(285, 244, '从上到下运行；重跑上方单元会让下方结果失去一致性', 9, MUTE));
    shell(host, '执行顺序（Execution Order）', '运行计数依次增加，重新执行会使状态不一致', svg,
      '方括号中的数字记录单元格（Cell）的执行时序，而非所在位置。重新运行第 2 个单元格会将 [2] 变为 [4]，但第 3 个单元格仍保留旧顺序下的结果；这种隐藏状态（Hidden State）不会体现在磁盘文件中。当计数不再自上而下递增时，只有重启并运行全部单元格（Restart and Run All），才能如实验证结果。');
  }

  // ── s0-env-isolation: 每项目独立环境（Per-project envs）互不干扰，全局 site-packages 发生冲突 ──
  // 06-python-environments
  function envIsolation(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '6s';
    [{ x: 135, name: 'project-a', chip: 'torch 2.4 · cu124', at: 0.04 },
     { x: 385, name: 'project-b', chip: 'torch 2.1 · cu118', at: 0.1 }].forEach(function (p) {
      svg.appendChild(pop(grp(p.x, 75, [
        box(-105, -45, 210, 90, BG, INKS),
        txt(-92, -26, p.name, 10, INK, 'start'),
        txt(92, -26, '.venv', 9, BP, 'end'),
        box(-90, -12, 180, 44, SURF, SOFT)
      ]), D, p.at));
      svg.appendChild(pop(grp(p.x, 75, [
        box(-80, -4, 160, 26, BG, BP),
        txt(0, 13, p.chip, 9, BP)
      ]), D, p.at + 0.18));
    });
    svg.appendChild(pop(grp(260, 192, [
      box(-150, -26, 300, 52, BG, MUTE),
      txt(0, -10, '全局 site-packages', 9, INK)
    ]), D, 0.16));
    var cA = grp(0, 0, [box(-52, -11, 104, 22, BG, MUTE), txt(0, 4, 'torch 2.4', 9, MUTE)]);
    travel(cA, 'M40 226 L232 199', D, 0.42, 0.54);
    svg.appendChild(cA);
    var cB = grp(0, 0, [box(-52, -11, 104, 22, BG, MUTE), txt(0, 4, 'torch 2.1', 9, MUTE)]);
    travel(cB, 'M480 226 L288 199', D, 0.48, 0.6);
    svg.appendChild(cB);
    var clash = grp(260, 199, [
      box(-66, -13, 132, 26, SURF, WARN),
      txt(0, 4, 'torch 2.? · 两者均失败', 9, WARN)
    ]);
    pop(clash, D, 0.62);
    svg.appendChild(clash);
    svg.appendChild(txt(260, 30, '每个项目各用一个解释器，在各自环境内解析依赖', 9, MUTE));
    shell(host, '依赖隔离（Dependency Isolation）', '各项目保留自己的 torch；全局安装会冲突', svg,
      '两个版本锁定（Version Pin）都正确，只是不能共用一个解释器（Interpreter）。全局安装时，第二次 pip install 会覆盖第一次，导致两个项目都无法运行。每个项目使用独立虚拟环境（Virtual Environment），即可拥有自己的 site-packages，让 torch 2.4 和 torch 2.1 在同一台机器上共存、互不干扰。');
  }

  // ── s0-image-layers: 各层堆叠为镜像（Image），各处容器（Containers）保持一致 ──
  // 07-docker-for-ai
  function imageLayers(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '6s';
    var layers = [
      { y: 196, t: 'FROM cuda:12.4', at: 0.04 },
      { y: 166, t: 'python 3.12', at: 0.12 },
      { y: 136, t: 'pip: torch 2.3', at: 0.2 },
      { y: 106, t: 'COPY train.py', at: 0.28 }
    ];
    svg.appendChild(txt(115, 78, '镜像（Image）', 9, MUTE));
    layers.forEach(function (L, i) {
      svg.appendChild(pop(grp(115, L.y, [
        box(-80, -13, 160, 26, i === 3 ? SURF : BG, i === 3 ? BP : INKS),
        txt(0, 4, L.t, 9, i === 3 ? BP : INK)
      ]), D, L.at));
    });
    svg.appendChild(wire(200, 120, 320, 75, D, 0.4, 130));
    svg.appendChild(wire(200, 165, 320, 185, D, 0.4, 130));
    svg.appendChild(pop(grp(255, 128, [txt(0, 0, 'docker run', 9, BP)]), D, 0.42));
    [{ y: 70, t: '你的笔记本电脑' }, { y: 182, t: '云端 GPU 主机' }].forEach(function (h, i) {
      svg.appendChild(pop(grp(400, h.y, [
        box(-78, -34, 156, 68, BG, MUTE),
        txt(0, -19, h.t, 9, MUTE)
      ]), D, 0.34 + i * 0.05));
      svg.appendChild(pop(grp(400, h.y + 8, [
        box(-66, -14, 132, 28, SURF, BP),
        txt(0, 4, '相同容器（Container）', 8, BP)
      ]), D, 0.55));
    });
    svg.appendChild(txt(260, 240, '同一镜像，在各主机上得到字节级一致的运行环境', 9, MUTE));
    shell(host, '镜像分层（Image Layers）', 'Dockerfile 构建一次分层镜像，容器可在各处运行', svg,
      '每条 Dockerfile 指令添加一个只读层（Read-only Layer）：CUDA 基础层、Python、torch，最上方是你的代码。构建完成的镜像（Image）固定了整个环境栈，因此 docker run 能在笔记本电脑和租用的 GPU 主机上生成相同的容器（Container），消除“只在我机器上能运行”的问题。');
  }

  // ── s0-lsp-roundtrip: 一次按键通过语言服务器（Language server）完成往返 ──
  // 08-editor-setup
  function lspRoundtrip(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var D = '4.5s';
    svg.appendChild(pop(grp(140, 110, [
      box(-105, -62, 210, 124, BG, INKS),
      txt(-92, -44, '编辑器（Editor）', 9, MUTE, 'start'),
      svgEl('rect', { x: -90, y: -28, width: 130, height: 7, rx: 2, fill: SURF }),
      svgEl('rect', { x: -90, y: -12, width: 96, height: 7, rx: 2, fill: SURF }),
      txt(-90, 16, 'model.fit(X, y', 10, INK, 'start'),
      svgEl('rect', { x: -90, y: 36, width: 150, height: 7, rx: 2, fill: SURF })
    ]), D, 0.03));
    svg.appendChild(pop(grp(420, 110, [
      box(-72, -40, 144, 80, BG, BP),
      txt(0, -20, 'pyright', 10, BP),
      txt(0, -6, '语言服务器', 8, MUTE)
    ]), D, 0.08));
    var pulse = svgEl('circle', { cx: 420, cy: 122, r: 6, fill: BP, opacity: 0 });
    pulse.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;0.9;0.2;0.9;0;0', keyTimes: '0;0.32;0.36;0.4;0.44;0.5;1', dur: D, repeatCount: 'indefinite' }));
    svg.appendChild(pulse);
    var req = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: INK });
    travel(req, 'M250 96 L344 96', D, 0.16, 0.3);
    svg.appendChild(req);
    var res = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: BG, stroke: BP, 'stroke-width': 1.5 });
    travel(res, 'M344 128 L250 128', D, 0.5, 0.64);
    svg.appendChild(res);
    svg.appendChild(pop(grp(297, 86, [txt(0, 0, 'didChange', 8, MUTE)]), D, 0.16));
    svg.appendChild(pop(grp(297, 148, [txt(0, 0, '诊断（Diagnostics）', 8, MUTE)]), D, 0.5));
    var squig = svgEl('path', { d: 'M-36 0 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0', fill: 'none', stroke: WARN, 'stroke-width': 1.6 });
    svg.appendChild(pop(grp(86, 132, [squig]), D, 0.68));
    svg.appendChild(pop(grp(140, 160, [txt(0, 0, '“(” 未闭合', 8, WARN)]), D, 0.74));
    shell(host, '语言服务器协议往返（LSP Round Trip）', '每条波浪线都来自一次请求与响应', svg,
      '理解 Python 的是语言服务器（Language Server），而非编辑器本身。每次编辑都会发送 didChange 通知；服务器重新检查文件，返回诊断信息（Diagnostics），再由编辑器显示为波浪线和悬停提示。安装 Python 与 Pylance 扩展后，每次按键都会触发这套循环；不安装时，编辑器就只是一个文本框。');
  }

  // ── s0-data-pipeline: 原始文件转为有类型的格式，再形成固定随机种子且版本化的数据划分（Splits） ──
  // 09-data-management
  function dataPipeline(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '6s';
    var stages = [
      { x: 90, t: '原始数据（Raw）', s: 'data.csv', at: 0.04 },
      { x: 255, t: '带类型（Typed）', s: 'data.parquet', at: 0.1 },
      { x: 425, t: '已版本化（Versioned）', s: '按种子 42 划分', at: 0.16 }
    ];
    stages.forEach(function (st) {
      svg.appendChild(pop(grp(st.x, 100, [
        box(-62, -30, 124, 60, BG, INKS),
        txt(0, -8, st.t, 10, INK),
        txt(0, 10, st.s, 8, MUTE)
      ]), D, st.at));
    });
    var chip = grp(0, 0, [svgEl('rect', { x: -10, y: -10, width: 20, height: 20, rx: 3, fill: BP })]);
    travel(chip, 'M152 100 L193 100', D, 0.26, 0.36);
    svg.appendChild(chip);
    var chip2 = grp(0, 0, [svgEl('rect', { x: -10, y: -10, width: 20, height: 20, rx: 3, fill: BP })]);
    travel(chip2, 'M317 100 L363 100', D, 0.44, 0.54);
    svg.appendChild(chip2);
    svg.appendChild(pop(grp(172, 78, [txt(0, 0, '类型转换 + 去重', 8, MUTE)]), D, 0.28));
    svg.appendChild(pop(grp(340, 78, [txt(0, 0, 'split(seed=42)', 8, MUTE)]), D, 0.46));
    [{ dx: -40, t: '训练' }, { dx: 0, t: '验证' }, { dx: 40, t: '测试' }].forEach(function (s, i) {
      svg.appendChild(pop(grp(425 + s.dx, 165, [
        box(-18, -12, 36, 24, SURF, BP),
        txt(0, 4, s.t, 8, BP)
      ]), D, 0.6 + i * 0.05));
    });
    svg.appendChild(pop(grp(425, 198, [txt(0, 0, '种子相同，每次得到相同数据行', 8, BP)]), D, 0.78));
    svg.appendChild(txt(180, 198, '保留原始数据；每一步均可重跑', 9, MUTE));
    shell(host, '数据流水线（Data Pipeline）', '原始文件转为带类型交付物，再按固定种子划分为可复现的数据集', svg,
      '原始 CSV 不直接修改：先转为带类型、经过压缩的 Parquet 交付物（Artifact），再用固定随机种子（Random Seed）划分训练集（Train）、验证集（Validation）和测试集（Test）。每条箭头都由脚本实现，种子也已固定，因此任何人都能重新生成计算这些指标时使用的确切数据行；这让实验结果具有可比性。');
  }

  // ── s0-shell-pipeline: 数据流每经过一段管道（Pipe）就进一步缩小 ──
  // 10-terminal-and-shell
  function shellPipeline(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 200' });
    var cmds = [
      { x: 85, t: 'tail -f train.log' },
      { x: 255, t: 'grep loss' },
      { x: 430, t: "awk '{print $8}'" }
    ];
    cmds.forEach(function (c, i) {
      svg.appendChild(box(c.x - 62, 62, 124, 44, BG, i === 1 ? BP : INKS));
      svg.appendChild(txt(c.x, 88, c.t, 9, i === 1 ? BP : INK));
    });
    svg.appendChild(txt(170, 78, '|', 14, MUTE));
    svg.appendChild(txt(342, 78, '|', 14, MUTE));
    for (var i = 0; i < 3; i++) {
      var keep = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: BP });
      keep.appendChild(svgEl('animateMotion', { path: 'M20 84 L500 84', dur: '3s', begin: (i * 1.0) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(keep);
    }
    for (var j = 0; j < 3; j++) {
      var dropped = svgEl('circle', { cx: 0, cy: 0, r: 4, fill: MUTE });
      dropped.appendChild(svgEl('animateMotion', { path: 'M20 84 L235 84 Q255 84 255 104 L255 140', dur: '3s', begin: (j * 1.0 + 0.5) + 's', repeatCount: 'indefinite' }));
      dropped.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0', keyTimes: '0;0.78;1', dur: '3s', begin: (j * 1.0 + 0.5) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(dropped);
    }
    svg.appendChild(txt(255, 160, '丢弃不匹配的行', 8, MUTE));
    svg.appendChild(txt(497, 60, '0.342', 9, BP, 'end'));
    svg.appendChild(txt(85, 130, '所有行', 8, MUTE));
    svg.appendChild(txt(430, 130, '仅保留数值', 8, MUTE));
    shell(host, '管道逐步筛选数据流（Pipe）', '每条命令读取上条命令的输出，再传递筛选后的内容', svg,
      '管道（Pipe）把上一条命令的标准输出（stdout）交给下一条命令的标准输入（stdin），中间不需要临时文件。完整日志流进入后，grep 丢弃不含 "loss" 的行，awk 只保留第 8 列，于是大量训练输出变成一串整洁的数值，可以实时观察或绘图。');
  }

  // ── s0-process-fork: 进程树（Process tree）逐层派生，直到你的训练进程 ──
  // 11-linux-for-ai
  function processFork(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var D = '6s';
    var nodes = [
      { x: 85, y: 45, t: 'systemd · pid 1', at: 0.04 },
      { x: 185, y: 100, t: 'sshd', at: 0.14 },
      { x: 285, y: 155, t: 'bash', at: 0.24 },
      { x: 405, y: 210, t: 'python train.py', at: 0.34 }
    ];
    svg.appendChild(wire(120, 55, 152, 90, D, 0.1, 60));
    svg.appendChild(wire(218, 110, 252, 145, D, 0.2, 60));
    svg.appendChild(wire(320, 165, 355, 200, D, 0.3, 60));
    nodes.forEach(function (n, i) {
      var last = i === 3;
      var g;
      if (last) {
        g = grp(n.x, n.y, [
          box(-60, -15, 120, 30, SURF, BP),
          txt(0, 4, n.t, 9, BP)
        ]);
        g.setAttribute('opacity', '0');
        g.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0;0', keyTimes: '0;0.34;0.42;0.72;0.76;1', dur: D, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1;0 0 1 1' }));
        g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;0.95;1;1;1;1', keyTimes: '0;0.34;0.42;0.72;0.76;1', dur: D, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0 0 1 1;0 0 1 1' }));
      } else {
        g = pop(grp(n.x, n.y, [
          box(-60, -15, 120, 30, BG, INKS),
          txt(0, 4, n.t, 9, INK)
        ]), D, n.at);
      }
      svg.appendChild(g);
    });
    nodes.slice(0, 3).forEach(function (n, i) {
      svg.appendChild(pop(grp(n.x + 70, n.y, [txt(0, 3, '派生（fork）', 8, MUTE, 'start')]), D, n.at + 0.06));
    });
    svg.appendChild(pop(grp(285, 128, [txt(0, 0, 'Ctrl-C · SIGINT', 8, WARN)]), D, 0.56));
    var sig = svgEl('circle', { cx: 0, cy: 0, r: 5, fill: WARN });
    travel(sig, 'M320 165 L385 202', D, 0.6, 0.7);
    svg.appendChild(sig);
    svg.appendChild(pop(grp(405, 235, [txt(0, 0, '退出（130）· GPU 已释放', 8, WARN)]), D, 0.74));
    svg.appendChild(txt(140, 220, 'ps aux 查看进程树；kill 发送同类信号', 8, MUTE));
    shell(host, '进程派生（Process Fork）', '主机上的程序都源自 pid 1，信号沿进程树向下传递', svg,
      '在 Linux GPU 主机上，所有程序都是从父进程派生（fork）出的进程：init 启动 sshd，登录会话启动 bash，bash 再启动训练进程。Ctrl-C 发送的 SIGINT，或针对通过 ps aux 找到的 pid 执行 kill，都可结束这个叶子进程并释放其 GPU 显存（GPU Memory）；这样就能回收被失效训练占用的主机。');
  }

  // ── s0-flame-hot: 性能剖析（Profile）在真正的瓶颈（Bottleneck）处变宽 ──
  // 12-debugging-and-profiling
  function flameHot(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '5.5s';
    var KT = '0;0.35;0.55;1';
    function w(node, attr, v1, v2) {
      node.appendChild(svgEl('animate', { attributeName: attr, values: v1 + ';' + v1 + ';' + v2 + ';' + v2, keyTimes: KT, dur: D, repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1' }));
      return node;
    }
    svg.appendChild(pop(grp(260, 185, [
      box(-220, -15, 440, 30, SURF, INK),
      txt(0, 4, 'train_step · 100%', 9, INK)
    ]), D, 0.04));
    var data = box(-220, -15, 150, 30, BG, WARN);
    w(data, 'width', 150, 270);
    var dataT = txt(-145, 4, '数据加载（Loading）', 9, INK);
    w(dataT, 'x', -145, -85);
    var fwd = box(-65, -15, 150, 30, BG, INKS);
    w(fwd, 'x', -65, 55); w(fwd, 'width', 150, 90);
    var fwdT = txt(10, 4, '前向（Forward）', 9, MUTE);
    w(fwdT, 'x', 10, 100);
    var bwd = box(90, -15, 130, 30, BG, INKS);
    w(bwd, 'x', 90, 150); w(bwd, 'width', 130, 70);
    var bwdT = txt(155, 4, '反向（Bwd）', 9, MUTE);
    w(bwdT, 'x', 155, 185);
    svg.appendChild(pop(grp(260, 150, [data, dataT, fwd, fwdT, bwd, bwdT]), D, 0.12));
    var hot = box(-220, -15, 130, 30, SURF, WARN);
    w(hot, 'width', 130, 250);
    var hotT = txt(-155, 4, 'DataLoader.__next__', 8, WARN);
    w(hotT, 'x', -155, -95);
    svg.appendChild(pop(grp(260, 115, [hot, hotT]), D, 0.2));
    svg.appendChild(pop(grp(330, 80, [txt(0, 0, '每步 62% 的时间用于获取批次', 9, WARN)]), D, 0.6));
    svg.appendChild(pop(grp(330, 98, [txt(0, 0, '调整：num_workers、pin_memory', 8, MUTE)]), D, 0.7));
    svg.appendChild(txt(260, 222, 'cProfile：将各调用的累计耗时绘为火焰图', 9, MUTE));
    shell(host, '耗时去向（Where the Time Goes）', '性能分析让实际耗时较多的函数显示为更宽的火焰', svg,
      '你怀疑的 GPU 数学计算并非瓶颈（Bottleneck）；性能分析器（Profiler）显示，每步的大部分实际耗时（Wall Time）都花在 DataLoader 中。每条横条表示一次调用的累计耗时，并堆叠在调用者上方；最宽的高塔指明应优化哪个函数。这里应增加加载工作进程（Worker）并启用锁页内存（Pinned Memory），而不是优化模型。');
  }

  LF.register({
    's0-env-stack': envStack,
    's0-commit-dag': commitDag,
    's0-gpu-dispatch': gpuDispatch,
    's0-secret-inject': secretInject,
    's0-cell-order': cellOrder,
    's0-env-isolation': envIsolation,
    's0-image-layers': imageLayers,
    's0-lsp-roundtrip': lspRoundtrip,
    's0-data-pipeline': dataPipeline,
    's0-shell-pipeline': shellPipeline,
    's0-process-fork': processFork,
    's0-flame-hot': flameHot
  });
})();
