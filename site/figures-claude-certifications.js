/* figures-claude-certifications.js：Claude 认证课程的交互机制实验。
   在 lesson-figures.js 与主题图表模块之后加载，通过 window.LF 注册。
   使用原生 ES5，无依赖。 */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var slider = LF.slider;
  var select = LF.select;
  var clamp = LF.clamp;

  function ensureStyles() {
    if (document.getElementById('cert-figure-styles')) return;
    var style = document.createElement('style');
    style.id = 'cert-figure-styles';
    style.textContent = [
      '.cf-shell{border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);margin:28px 0;font-family:var(--font-body,serif)}',
      '.cf-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px;border-bottom:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:0;text-transform:uppercase;color:var(--ink-mute,#777)}',
      '.cf-head strong{color:var(--blueprint,#3553ff);font-weight:600}',
      '.cf-body{padding:16px}',
      '.cf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 22px}',
      '.cf-output{margin-top:18px;padding-top:16px;border-top:1px dashed var(--rule-soft,#ddd)}',
      '.cf-status{max-width:100%;font-family:var(--font-mono,monospace);font-size:1.2rem;line-height:1.45;letter-spacing:0;overflow-wrap:anywhere;color:var(--blueprint,#3553ff)}',
      '.cf-status small{display:block;margin-top:8px;font-family:var(--font-body,serif);font-size:.86rem;line-height:1.5;letter-spacing:0;color:var(--ink-soft,#555)}',
      '.cf-head>*,.cf-body,.cf-output,.cf-grid>*,.cf-meter-label>*{min-width:0}.cf-head,.cf-meta,.cf-formula,.cf-step,.cf-lane,.cf-caption,.cf-meter-label{overflow-wrap:anywhere;letter-spacing:0}.cf-shell .lf-ctrl select{width:100%;min-width:0;max-width:100%;box-sizing:border-box}',
      '.cf-meta,.cf-formula{margin-top:8px;font-family:var(--font-mono,monospace);font-size:.7rem;line-height:1.5;color:var(--ink-mute,#777)}',
      '.cf-formula{color:var(--ink-soft,#555)}',
      '.cf-caption{padding:12px 16px;border-top:1px solid var(--rule-soft,#ddd);font-size:.92rem;line-height:1.55;color:var(--ink-soft,#555)}',
      '.cf-meter-list{display:grid;gap:10px;margin-top:14px}',
      '.cf-meter-row{display:grid;gap:4px}',
      '.cf-meter-label{display:flex;justify-content:space-between;gap:12px;font-family:var(--font-mono,monospace);font-size:.68rem;color:var(--ink-soft,#555)}',
      '.cf-meter{height:10px;overflow:hidden;background:var(--rule-soft,#ddd)}',
      '.cf-meter>i{display:block;width:100%;height:100%;background:var(--blueprint,#3553ff);transform:scaleX(0);transform-origin:left;transition:transform 120ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.cf-meter.is-warning>i{background:var(--warn,#b8870f)}',
      '.cf-pipeline{display:grid;grid-template-columns:repeat(var(--cf-steps),minmax(0,1fr));gap:6px;margin-top:14px}',
      '.cf-step{min-height:72px;padding:9px;border:1px solid var(--rule-soft,#ddd);background:var(--bg-surface,#eee);font-family:var(--font-mono,monospace);font-size:.65rem;line-height:1.35;color:var(--ink-mute,#777)}',
      '.cf-step strong,.cf-step span{display:block}',
      '.cf-step strong{margin-bottom:5px;color:var(--ink,#111)}',
      '.cf-step.is-done{border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff)}',
      '.cf-step.is-active{border-color:var(--blueprint,#3553ff);background:var(--blueprint,#3553ff);color:var(--bg,#fff)}',
      '.cf-step.is-active strong{color:var(--bg,#fff)}',
      '.cf-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}',
      '.cf-lane{padding:10px;border:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.68rem;text-align:center;color:var(--ink-mute,#777)}',
      '.cf-lane.is-active{border-color:var(--blueprint,#3553ff);background:var(--blueprint-tint,rgba(53,83,255,.08));color:var(--blueprint,#3553ff)}',
      '@media(max-width:640px){.cf-grid{grid-template-columns:1fr}.cf-pipeline{grid-template-columns:1fr}.cf-lanes{grid-template-columns:1fr}.cf-step{min-height:0}}',
      '@media(prefers-reduced-motion:reduce){.cf-meter>i,.cf-shell .lf-bar i{transition:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function labelControls(root) {
    var groups = root.querySelectorAll('.lf-ctrl');
    for (var index = 0; index < groups.length; index++) {
      var control = groups[index].querySelector('input,select');
      var label = groups[index].querySelector('label');
      if (!control || !label || control.getAttribute('aria-label')) continue;
      var name = '';
      for (var node = label.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === 3) name += node.nodeValue;
      }
      control.setAttribute('aria-label', name.trim() || '交互数值');
    }
  }

  function shell(host, config, controls, output) {
    ensureStyles();
    var section = el('section', { class: 'cf-shell' }, [
      el('div', { class: 'cf-head' }, [
        el('strong', {}, [config.title]),
        el('span', {}, [config.hint || '调整输入'])
      ]),
      el('div', { class: 'cf-body' }, [controls, output]),
      el('div', { class: 'cf-caption' }, [config.caption])
    ]);
    host.appendChild(section);
    labelControls(section);
  }

  function meterRow(name) {
    var value = el('span', {}, ['0']);
    var fill = el('i');
    var meter = el('div', {
      class: 'cf-meter', role: 'progressbar',
      'aria-label': name,
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0'
    }, [fill]);
    return {
      root: el('div', { class: 'cf-meter-row' }, [
        el('div', { class: 'cf-meter-label' }, [el('span', {}, [name]), value]),
        meter
      ]),
      update: function (score, warning) {
        var safe = clamp(Math.round(score), 0, 100);
        value.textContent = safe + '%';
        meter.setAttribute('aria-valuenow', String(safe));
        meter.classList.toggle('is-warning', !!warning);
        fill.style.transform = 'scaleX(' + (safe / 100).toFixed(3) + ')';
      }
    };
  }

  function makeDecision(config) {
    return function (host) {
      var state = { a: config.a.defaultValue, b: config.b.defaultValue };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var list = el('div', { class: 'cf-meter-list' });
      var rows = config.choices.map(function (choice) {
        var row = meterRow(choice.name);
        list.appendChild(row.root);
        return row;
      });

      state._render = function () {
        var bestIndex = 0;
        var bestScore = -1;
        config.choices.forEach(function (choice, index) {
          var score = choice.base + choice.a * ((state.a - 50) / 50) + choice.b * ((state.b - 50) / 50);
          score = clamp(score, 0, 100);
          rows[index].update(score, false);
          if (score > bestScore) {
            bestIndex = index;
            bestScore = score;
          }
        });
        var best = config.choices[bestIndex];
        status.innerHTML = best.name + '<small>' + best.why + '</small>';
        meta.textContent = config.a.label + ' ' + state.a + '  ·  ' + config.b.label + ' ' + state.b + '  ·  适配度 ' + Math.round(bestScore) + '%';
        formula.textContent = config.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'a', config.a.label, 0, 100, 1),
        slider(state, 'b', config.b.label, 0, 100, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, list, meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeThreshold(config) {
    return function (host) {
      var state = { signal: config.signal.defaultValue, impact: config.impact.defaultValue, cut: config.cut };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var scoreMeter = meterRow(config.scoreLabel || '决策风险');
      var lanes = config.decisions.map(function (name) {
        var lane = el('div', { class: 'cf-lane' }, [name]);
        return lane;
      });

      state._render = function () {
        var score = Math.round(state.signal * config.signalWeight + state.impact * (1 - config.signalWeight));
        var index = score < state.cut ? 0 : score < state.cut + config.escalationBand ? 1 : 2;
        lanes.forEach(function (lane, laneIndex) { lane.classList.toggle('is-active', laneIndex === index); });
        scoreMeter.update(score, index === 2);
        status.innerHTML = config.decisions[index] + '<small>' + config.reasons[index] + '</small>';
        meta.textContent = config.signal.label + ' ' + state.signal + '  ·  ' + config.impact.label + ' ' + state.impact + '  ·  阈值 ' + state.cut;
        formula.textContent = config.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'signal', config.signal.label, 0, 100, 1),
        slider(state, 'impact', config.impact.label, 0, 100, 1),
        slider(state, 'cut', config.thresholdLabel || '审查阈值', 20, 80, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, scoreMeter.root, el('div', { class: 'cf-lanes' }, lanes), meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makePipeline(config) {
    return function (host) {
      var state = { step: 0 };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var pipeline = el('div', { class: 'cf-pipeline', style: '--cf-steps:' + config.steps.length });
      var cards = config.steps.map(function (step, index) {
        var card = el('div', { class: 'cf-step' }, [
          el('strong', {}, [(index + 1) + '. ' + step.name]),
          el('span', {}, [step.short])
        ]);
        pipeline.appendChild(card);
        return card;
      });

      state._render = function () {
        cards.forEach(function (card, index) {
          card.classList.toggle('is-done', index < state.step);
          card.classList.toggle('is-active', index === state.step);
          card.querySelector('span').textContent = index < state.step ? '已验证' : index === state.step ? config.steps[index].short : '等待中';
        });
        var active = config.steps[state.step];
        status.innerHTML = active.name + '<small>' + active.detail + '</small>';
        meta.textContent = '第 ' + (state.step + 1) + ' 阶段，共 ' + config.steps.length + ' 阶段  ·  ' + config.formula;
      };

      var controls = el('div', {}, [slider(state, 'step', config.controlLabel || '当前阶段', 0, config.steps.length - 1, 1)]);
      var output = el('div', { class: 'cf-output' }, [status, pipeline, meta]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeEquation(config) {
    return function (host) {
      var state = { a: config.a.defaultValue, b: config.b.defaultValue };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var resultMeter = meterRow(config.meterLabel);

      state._render = function () {
        var result = config.calculate(state.a, state.b);
        resultMeter.update(result.percent, result.warning);
        status.innerHTML = result.value + '<small>' + result.status + '</small>';
        meta.textContent = result.meta;
        formula.textContent = result.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'a', config.a.label, config.a.min, config.a.max, config.a.step),
        slider(state, 'b', config.b.label, config.b.min, config.b.max, config.b.step)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, resultMeter.root, meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeReadiness(config) {
    return function (host) {
      var state = { knowledge: 55, practice: 35, evidence: 25 };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var readiness = meterRow('路线准备度');

      state._render = function () {
        var score = Math.round(state.knowledge * config.weights[0] + state.practice * config.weights[1] + state.evidence * config.weights[2]);
        var stage = score >= 80 ? config.ready : score >= 60 ? config.near : config.build;
        readiness.update(score, score < 60);
        status.innerHTML = score + '%<small>' + stage + '</small>';
        meta.textContent = config.formula + '  ·  最薄弱的维度：' + [
          ['知识（Knowledge）', state.knowledge], ['练习（Practice）', state.practice], ['证据（Evidence）', state.evidence]
        ].sort(function (x, y) { return x[1] - y[1]; })[0][0];
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'knowledge', config.labels[0], 0, 100, 1),
        slider(state, 'practice', config.labels[1], 0, 100, 1),
        slider(state, 'evidence', config.labels[2], 0, 100, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, readiness.root, meta]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function contextCache(host) {
    ensureStyles();
    var state = { mode: 'prefix' };
    var stage = el('div');
    state._render = function () {
      while (stage.firstChild) stage.removeChild(stage.firstChild);
      var name = state.mode === 'prefix' ? 'prompt-cache-hit' : 'semantic-cache';
      var figure = window.LESSON_FIGURES && window.LESSON_FIGURES[name];
      if (figure) figure(stage, {});
      labelControls(stage);
    };
    var controls = el('div', { class: 'cf-grid' }, [
      select(state, 'mode', '缓存机制（Cache Mechanism）', [['服务商前缀缓存', 'prefix'], ['应用侧语义缓存', 'semantic']])
    ]);
    shell(host, {
      title: '上下文缓存实验（Context Cache Lab）',
      hint: '切换机制，再拖动控件',
      caption: '前缀缓存（Prefix Caching）跳过重复的提示词计算；语义缓存（Semantic Caching）为相似查询复用先前答案。前者在服务商侧进行精确匹配，后者在应用侧进行近似匹配，因此后者的阈值也是一项安全决策。'
    }, controls, el('div', { class: 'cf-output' }, [stage]));
    state._render();
  }

  var decisions = {
    '01-claude-model-fit': {
      title: '模型适配计算器（Model Fit Calculator）', hint: '调整延迟与推理需求',
      a: { label: '延迟压力', defaultValue: 65 }, b: { label: '推理复杂度', defaultValue: 55 },
      choices: [
        { name: 'Haiku', base: 60, a: 34, b: -28, why: '当延迟是主要约束、任务范围明确时，使用速度最快的档位。' },
        { name: 'Sonnet', base: 76, a: 4, b: 8, why: '当速度与推理能力都重要时，使用均衡档位。' },
        { name: 'Opus', base: 58, a: -24, b: 36, why: '只有任务复杂度足以证明成本合理时，才使用推理能力最强的档位。' }
      ],
      formula: '适配度 = 基线 + 延迟系数 + 推理系数：fit = baseline + latency coefficient + reasoning coefficient',
      caption: '模型选择应依据工作负载，而不是排行榜。调整约束，观察最适合的模型如何变化。'
    },
    '16-multi-agent-topology': {
      title: '编排拓扑（Orchestration Topology）', hint: '调整耦合程度与并行度',
      a: { label: '任务耦合程度', defaultValue: 55 }, b: { label: '可并行工作量', defaultValue: 60 },
      choices: [
        { name: '单智能体（Single Agent）', base: 72, a: 22, b: -30, why: '步骤彼此高度依赖时，保留单一上下文。' },
        { name: '监督者（Supervisor）', base: 74, a: 5, b: 10, why: '工作可以拆分、但决策仍需统一负责人时，使用监督者。' },
        { name: '对等智能体群（Peer Swarm）', base: 55, a: -28, b: 36, why: '只有工作彼此独立且具备明确合并契约时，才使用对等智能体。' }
      ],
      formula: '拓扑适配度（Topology Fit）权衡依赖成本与可用并行度。',
      caption: '更多智能体会增加协调成本。只有任务足够独立、结果能够安全合并时，并行执行才有帮助。'
    },
    '18-tool-discovery-contract': {
      title: '工具发现预算（Tool Discovery Budget）', hint: '调整工具数量与歧义程度',
      a: { label: '可用工具数量', defaultValue: 45 }, b: { label: '请求歧义程度', defaultValue: 50 },
      choices: [
        { name: '全部开放（Expose All）', base: 70, a: -36, b: -12, why: '只有注册表规模较小、意图明确时，才开放全部工具。' },
        { name: '渐进式发现（Progressive Discovery）', base: 78, a: 20, b: 16, why: '先提供少量相关工具，只在必要时扩展集合。' },
        { name: '固定工作流（Fixed Workflow）', base: 60, a: -8, b: 26, why: '当歧义较大、但流程已知时，使用固定顺序。' }
      ],
      formula: '无关工具越多、意图越模糊，选择质量（Selection Quality）越低。',
      caption: '模型难以从无限的工具列表中作出恰当选择。渐进式发现先缩小候选范围，再进入执行。'
    },
    '22-sla-value-tradeoff': {
      title: '服务等级协议与价值权衡（SLA Value Tradeoff）', hint: '调整业务影响与可靠性要求',
      a: { label: '业务影响', defaultValue: 65 }, b: { label: '可靠性要求', defaultValue: 70 },
      choices: [
        { name: '辅助式工作流（Assistive Workflow）', base: 74, a: -12, b: -20, why: '当价值有限或不确定性仍较高时，让人保留控制权。' },
        { name: '带防护的自动化（Guarded Automation）', base: 78, a: 8, b: 12, why: '对常规路径实施自动化，同时设置可测量的门禁和明确的回退方案。' },
        { name: '确定性服务（Deterministic Service）', base: 54, a: 20, b: 32, why: '当可靠性是首要要求时，将关键不变量移到模型之外执行。' }
      ],
      formula: '架构适配度 = 获得的业务价值减去故障风险暴露：architecture fit = business value captured minus failure exposure',
      caption: '最佳 AI 架构应在实现预期价值的前提下，将依赖概率性行为的部分压缩到最小。'
    },
    '23-architecture-tradeoff': {
      title: '架构选择（Architecture Choice）', hint: '调整知识新鲜度与工作流复杂度',
      a: { label: '知识新鲜度', defaultValue: 70 }, b: { label: '工作流复杂度', defaultValue: 55 },
      choices: [
        { name: '仅用提示词（Prompt Only）', base: 70, a: -28, b: -18, why: '对于稳定知识和范围明确的转换任务，只使用提示词即可。' },
        { name: '检索增强生成服务（RAG Service）', base: 68, a: 36, b: -5, why: '当答案依赖持续变化或私有的知识时，进行检索。' },
        { name: '智能体工作流（Agent Workflow）', base: 58, a: 4, b: 38, why: '只有系统必须选择操作并安排执行顺序时，才引入智能体。' }
      ],
      formula: '从满足知识新鲜度与操作需求的最简单架构开始。',
      caption: '提示词、检索和智能体解决不同问题。只有需求确实要求时，才引入复杂性。'
    }
  };

  var thresholds = {
    '02-responsible-ai-risk': ['负责任 AI 风险（Responsible AI Risk）', '模型不确定性', '用户影响', ['允许', '人工审查（Human Review）', '阻止并升级处理'], ['低风险使用仍须处于策略允许范围内。', '发布前，审查者必须解决不确定性。', '影响重大的不确定性触及停止边界。']],
    '06-data-analysis-confidence': ['分析置信度（Analysis Confidence）', '证据缺口', '决策影响', ['附带限制说明后发布', '核实来源', '停止分析'], ['现有证据支持范围有限的结论。', '重新计算，或检索缺失的证据。', '不要将薄弱证据转化为笃定的决策。']],
    '07-human-review-threshold': ['人工接管（Human Handoff）', '模型不确定性', '撤销操作的成本', ['自动完成', '请求审查', '交由负责人处理'], ['该操作风险低且可逆。', '应由人工确认提议的操作。', '必须由承担责任的负责人决策。']],
    '11-mcp-permission-boundary': ['MCP 权限边界（MCP Permission Boundary）', '请求的权限级别', '资源敏感度', ['允许限定范围的调用', '要求批准', '拒绝请求'], ['调用未超出最小权限契约。', '扩大的范围必须经人工批准。', '请求的能力超出服务器边界。']],
    '13-secrets-threat-model': ['秘密泄露风险（Secret Exposure Risk）', '泄露可能性', '凭据影响范围', ['安全继续', '轮换凭据并调查', '遏制事故'], ['没有秘密越过模型或日志边界。', '将可能发生的泄露视为事故信号。', '在开展任何其他操作前，先撤销访问权限。']],
    '20-batch-review-confidence': ['批量审查门禁（Batch Review Gate）', '抽取不确定性', '记录的重要程度', ['接受批次', '抽样审查', '隔离批次'], ['该批次达到最低质量要求。', '发布前检查按风险加权选取的样本。', '在弄清故障模式前，停止继续传播。']],
    '21-provenance-escalation': ['来源追溯门禁（Provenance Gate）', '缺乏支持的论断', '决策后果', ['附引用作答', '检索证据', '上报不确定性'], ['每项实质性论断都有可追溯证据。', '系统必须检索或请求缺失的支持材料。', '后果过于重大，不能给出缺乏支持的答案。']],
    '27-governance-approval-flow': ['治理批准（Governance Approval）', '策略偏离程度', '受影响人群', ['标准发布', '风险批准', '由管理层叫停'], ['常规控制措施足以覆盖本次发布。', '该偏离需要有记录的风险接受决定。', '改动超出已委派的权限。']]
  };

  var pipelines = {
    '03-prompt-contract': ['提示词契约（Prompt Contract）', '契约阶段', ['意图（Intent）', '输入（Inputs）', '约束（Constraints）', '输出（Output）', '测试（Tests）'], ['定义模型必须支持的决策。', '明确所需上下文，拒绝缺少必填字段的输入。', '写明边界、拒绝规则和不变量。', '声明下游代码所需的确切结构。', '运行常规、边界、对抗及数据缺失用例。']],
    '05-document-vision-pipeline': ['文档与视觉流水线（Document and Vision Pipeline）', '流水线阶段', ['接入（Ingest）', '分段（Segment）', '抽取（Extract）', '校验（Validate）', '路由（Route）'], ['保留页面和图像的身份标识。', '按照语义与视觉边界拆分。', '返回字段及其来源坐标。', '检查模式、合计值和跨页一致性。', '将低置信度案例交给相应负责人。']],
    '08-messages-lifecycle': ['Messages API 生命周期（Messages API Lifecycle）', '请求阶段', ['组织请求（Compose）', '发送（Send）', '检查（Inspect）', '继续（Continue）', '记录（Record）'], ['组织有序的角色、内容块及限制。', '提交一次边界明确的请求。', '读取停止原因、用量及返回的内容块。', '追加工具结果或下一轮用户输入。', '持久保存调试与成本分析所需的轨迹。']],
    '09-structured-output-recovery': ['结构化输出恢复（Structured Output Recovery）', '恢复阶段', ['生成（Generate）', '解析（Parse）', '校验（Validate）', '修复（Repair）', '升级处理（Escalate）'], ['要求按声明的模式输出。', '将响应视为不可信字节。', '检查类型、取值范围和业务不变量。', '携带确切的校验错误重试一次。', '返回有类型定义的失败结果，不要猜测。']],
    '12-agent-hook-lifecycle': ['智能体钩子生命周期（Agent Hook Lifecycle）', '钩子阶段', ['开始（Start）', '工具执行前（Pre-tool）', '执行（Execute）', '工具执行后（Post-tool）', '停止（Stop）'], ['创建追踪与策略上下文。', '产生副作用前，先对参数进行授权检查。', '执行范围受限的操作。', '记录输出、成本及状态变化。', '关闭资源并发布终态结果。']],
    '14-eval-observability-loop': ['评估与可观测性循环（Eval and Observability Loop）', '反馈阶段', ['数据集（Dataset）', '运行（Run）', '评分（Score）', '追踪（Trace）', '改进（Improve）'], ['对代表性用例和故障子集进行版本管理。', '执行确切的候选配置。', '测量任务表现、安全性、延迟和成本。', '将汇总的失败情况关联到单次运行轨迹。', '只调整一个假设，然后重跑同一组用例。']],
    '15-team-agent-loop': ['团队智能体循环（Team Agent Loop）', '团队协作阶段', ['规划（Plan）', '分派（Assign）', '执行（Execute）', '审查（Review）', '合并（Merge）'], ['写明验收标准与职责归属。', '为每个智能体分配范围明确、互不重叠的工作区域。', '产出可检查的工作成果与验证证据。', '检查正确性、冲突和范围遗漏。', '只有所有契约一致后才集成。']],
    '19-memory-rule-precedence': ['记忆与规则优先级（Memory and Rule Precedence）', '优先级解析阶段', ['当前请求（Current Request）', '仓库规则（Repository Rules）', '当前代码（Live Code）', '项目记忆（Project Memory）', '全局默认值（Global Defaults）'], ['在授权范围内，以最新的明确指令为准。', '应用离当前工作位置最近、仍受维护的项目契约。', '对照当前实现核实行为。', '先检查持久上下文是否已过时，再使用它。', '最后才回退到通用偏好。']],
    '25-identity-permission-path': ['身份与权限路径（Identity and Permission Path）', '授权阶段', ['认证（Authenticate）', '解析执行者（Resolve Actor）', '授权（Authorize）', '执行（Execute）', '审计（Audit）'], ['验证提交的身份。', '绑定用户、租户及被委派的服务身份。', '按最小权限原则评估资源与操作。', '只执行已获授权的操作。', '记录执行者、决定、目标和结果。']],
    '28-adr-lifecycle': ['架构决策记录生命周期（ADR Lifecycle）', '决策阶段', ['上下文（Context）', '选项（Options）', '决定（Decision）', '后果（Consequences）', '重新评估（Revisit）'], ['说明约束，以及为何需要作出决策。', '使用相同标准比较可行替代方案。', '明确选定方案及承担责任的负责人。', '记录收益、成本、风险及后续事项。', '当假设或指标变化时，重新开启决策。']]
  };

  var figures = {
    '00-certification-route-map': makeReadiness({
      title: '认证路线准备度（Certification Route Readiness）', hint: '依据证据评分，而非主观信心', labels: ['考试知识', '限时练习', '已交付证据'], weights: [0.35, 0.3, 0.35],
      ready: '已准备好参加限时完整模拟考试', near: '补齐最薄弱的维度，然后重新测试', build: '回到课程学习并产出证据',
      formula: '知识、限时练习与交付物的加权和：35% knowledge + 30% timed practice + 35% artifacts',
      caption: '准备度不取决于你对考试大纲感觉多么熟悉，而取决于你能解释什么、在限时压力下完成什么，以及用交付物证明什么。'
    }),
    '04-context-cache': contextCache,
    '10-tool-loop-budget': makeEquation({
      title: '工具循环预算（Tool Loop Budget）', hint: '调整调用上限与成功率', meterLabel: '成功完成率',
      a: { label: '工具调用次数上限', min: 1, max: 20, step: 1, defaultValue: 8 }, b: { label: '单次调用成功率（%）', min: 10, max: 95, step: 1, defaultValue: 65 },
      calculate: function (calls, success) { var p = 1 - Math.pow(1 - success / 100, calls); return { value: (p * 100).toFixed(1) + '%', status: calls > 12 ? '完成率上升，但循环失控的风险已较高。' : '限制循环范围，并检查每个停止原因。', percent: p * 100, warning: calls > 12, meta: calls + ' 次调用上限  ·  ' + success + '% 的概率在每次调用中推进任务', formula: '至少成功一次的概率：P(at least one success) = 1 - (1 - p)^calls（p：单次成功概率；calls：调用次数）' }; },
      caption: '工具循环需要明确的调用预算、终止条件及有类型定义的失败结果。增加重试可能提高完成率，同时也会增加延迟、成本和副作用风险。'
    }),
    '17-session-context-budget': makeEquation({
      title: '会话上下文预算（Session Context Budget）', hint: '调整历史记录与压缩比例', meterLabel: '上下文占用量',
      a: { label: '原始历史词元数', min: 1000, max: 200000, step: 1000, defaultValue: 80000 }, b: { label: '压缩后保留比例（%）', min: 5, max: 100, step: 1, defaultValue: 35 },
      calculate: function (tokens, retained) { var used = Math.round(tokens * retained / 100); var pct = used / 100000 * 100; return { value: used.toLocaleString('en-US') + ' 个词元（Token）', status: pct > 80 ? '继续之前，再次压缩或按需检索。' : '会话保留决策，同时为新工作留出空间。', percent: pct, warning: pct > 80, meta: tokens.toLocaleString('en-US') + ' 个原始词元  ·  ' + retained + '% 在压缩后保留', formula: '活动上下文 = 历史词元数 × 保留比例：active context = history tokens × retained fraction' }; },
      caption: '会话记忆应保留决策、约束和未解决的状态，而不是重放每个词元（Token）。压缩（Compaction）是一个信息设计问题。'
    }),
    '24-rag-ranking': makeEquation({
      title: 'RAG 排序阈值（RAG Ranking Threshold）', hint: '调整相关性与证据覆盖率', meterLabel: '答案支持度',
      a: { label: '检索相关性（%）', min: 0, max: 100, step: 1, defaultValue: 72 }, b: { label: '证据覆盖率（%）', min: 0, max: 100, step: 1, defaultValue: 68 },
      calculate: function (relevance, coverage) { var support = relevance * 0.55 + coverage * 0.45; return { value: Math.round(support) + '% 支持度', status: support >= 75 ? '附带引用生成答案，并保留排序后的证据。' : support >= 55 ? '再次检索，或缩小问题范围。' : '语料库无法支持答案，因此弃答。', percent: support, warning: support < 55, meta: relevance + '% 相关性  ·  ' + coverage + '% 论断覆盖率', formula: '支持度 = 0.55 × 相关性 + 0.45 × 证据覆盖率：support = 0.55 × relevance + 0.45 × evidence coverage' }; },
      caption: '检索质量不只是最近邻相似度。选中的证据还必须覆盖答案准备提出的论断。'
    }),
    '26-latency-cost-slo': makeEquation({
      title: '延迟与成本服务等级目标（Latency and Cost SLO）', hint: '调整缓存命中率与模型延迟', meterLabel: '已用延迟预算',
      a: { label: '缓存命中率（%）', min: 0, max: 100, step: 1, defaultValue: 60 }, b: { label: '未命中缓存时的延迟（ms）', min: 200, max: 6000, step: 100, defaultValue: 2400 },
      calculate: function (hit, latency) { var effective = hit / 100 * 80 + (1 - hit / 100) * latency; var pct = effective / 2000 * 100; return { value: Math.round(effective) + ' ms', status: effective <= 2000 ? '混合路径满足 2 秒目标。' : '减少模型工作量，提高安全的缓存命中率，或调整服务等级目标（SLO）。', percent: pct, warning: effective > 2000, meta: hit + '% 命中耗时 80 ms  ·  未命中耗时 ' + latency + ' ms', formula: '混合延迟 = 命中率 × 80 ms + 未命中率 × 未缓存延迟：blended latency = hit rate × 80 ms + miss rate × uncached latency' }; },
      caption: '平均值会掩盖架构差异。模型延迟、缓存行为与可接受的服务目标必须作为一个整体系统测量。'
    })
  };

  Object.keys(decisions).forEach(function (id) { figures[id] = makeDecision(decisions[id]); });
  Object.keys(thresholds).forEach(function (id) {
    var item = thresholds[id];
    figures[id] = makeThreshold({
      title: item[0], hint: '调整风险与阈值', signal: { label: item[1], defaultValue: 45 }, impact: { label: item[2], defaultValue: 60 },
      cut: 50, signalWeight: 0.55, escalationBand: 20, decisions: item[3], reasons: item[4],
      scoreLabel: '综合决策分数', thresholdLabel: '审查阈值', formula: '综合分数：score = 55% signal + 45% impact（signal：信号；impact：影响）；阈值决定控制路径。',
      caption: '可靠系统将不确定性与后果转化为明确的控制路径。调整审查阈值改变的是自动化策略，并不会改变模型输出是否真实。'
    });
  });
  Object.keys(pipelines).forEach(function (id) {
    var item = pipelines[id];
    figures[id] = makePipeline({
      title: item[0], hint: '拖动以逐步查看机制', controlLabel: item[1],
      steps: item[2].map(function (name, index) { return { name: name, short: item[3][index], detail: item[3][index] }; }),
      formula: '每个经过验证的阶段都成为下一阶段的契约。',
      caption: '逐阶段推进，检查每个边界上的契约。可靠性来自明确的状态转换，而非寄希望于一条长提示词处理整个工作流。'
    });
  });

  [
    ['29-associate-capstone-readiness', '助理级综合实践（Associate Capstone）', ['工作流决策', '场景练习', '交接证据'], [0.35, 0.35, 0.3]],
    ['30-developer-capstone-readiness', '开发者综合实践（Developer Capstone）', ['API 机制', '经过测试的实现', '运维资料包'], [0.3, 0.4, 0.3]],
    ['31-architect-foundation-readiness', '架构师基础综合实践（Architect Foundations Capstone）', ['模式选择', '权衡练习', '架构资料包'], [0.35, 0.3, 0.35]],
    ['32-architect-professional-readiness', '架构师专业综合实践（Architect Professional Capstone）', ['系统判断', '故障演练', '治理证据'], [0.3, 0.35, 0.35]]
  ].forEach(function (item) {
    figures[item[0]] = makeReadiness({
      title: item[1], hint: '衡量你能证明的能力', labels: item[2], weights: item[3],
      ready: '综合实践证据已准备好，可按评分标准审查', near: '补强最薄弱的证据，然后重跑验证器', build: '先完成缺失的交付物，再声称已经准备就绪',
      formula: Math.round(item[3][0] * 100) + '% knowledge + ' + Math.round(item[3][1] * 100) + '% practice + ' + Math.round(item[3][2] * 100) + '% evidence（knowledge：知识；practice：练习；evidence：证据）',
      caption: '当另一位工程师无需重新推断你的意图，就能检查决策、运行验证器并操作成果时，综合实践才算完成。'
    });
  });

  LF.register(figures);
})();
