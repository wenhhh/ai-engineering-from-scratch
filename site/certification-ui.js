/* Certification display labels, separate from exam facts, question keys and progress. */
(function (scope) {
  'use strict';
  var zh = {
  " · Supplemental to ": " · 所属路径外的补充内容：",
  "Learn ": "学习 ",
  " with an AI tutor on GitHub, opens in a new tab": "：在 GitHub 使用 AI 导师（在新标签页打开）",
  "\">Learn with an AI tutor on GitHub ↗</a>": "\">在 GitHub 使用 AI 导师学习 ↗</a>",
  "Read the ": "阅读 ",
  " tutor skill on GitHub, opens in a new tab": " 的导师技能：GitHub（在新标签页打开）",
  "\">Read the tutor skill ↗</a>": "\">阅读导师技能 ↗</a>",
  "Learn with an AI tutor on GitHub": "在 GitHub 使用 AI 导师学习",
  "Read the tutor skill": "阅读导师技能",
  " lessons": " 节课程",
  " lessons · ": " 节课 · ",
  " domains</span><span>Open path →</span></div>": " 个领域</span><span>打开路径 →</span></div>",
  "Study path": "学习路径",
  "A practical route through this certification blueprint.": "围绕本认证考试大纲构建的实践学习路径。",
  "Certification": "认证",
  "Certification program": "认证项目",
  "this certification": "此认证",
  "<div class=\"cert-deep-dive-badge\">OPTIONAL</div>": "<div class=\"cert-deep-dive-badge\">可选</div>",
  "Independent practice": "独立练习",
  "Reference": "参考资料",
  "Foundational": "基础级（Foundational）",
  "Beginner": "入门级（Beginner）",
  "Foundational technical": "技术基础级（Foundational technical）",
  "Foundational architecture": "架构基础级（Foundational architecture）",
  "Professional architecture": "架构专业级（Professional architecture）",
  "Multiple choice": "选择题（Multiple choice）",
  "Online proctored": "在线监考（Online proctored）",
  "Online proctored or test center": "在线监考或考试中心",
  "September 2026": "2026 年 9 月",
  "July 2026": "2026 年 7 月",
  "orientation": "入门导览（Orientation）",
  "core": "核心课程",
  "capstone": "综合实践（Capstone）",
  "review": "复习",
  "Learn": "学习",
  "Build": "动手实现（Build）",
  "diagnostic": "诊断评估（Diagnostic）",
  "mock": "模拟考试（Mock）",
  "Multiple-choice and multiple-response": "单选与多选（Multiple-choice and Multiple-response）",
  "Scenario-based multiple-choice and multiple-response; four scenarios drawn from six": "基于场景的单选与多选：从六个场景中抽取四个"
};
  function create(language) {
    var chinese = /^zh(?:-|$)/i.test(String(language || ''));
    function text(value) {
      return chinese && typeof value === 'string' && Object.prototype.hasOwnProperty.call(zh, value) ? zh[value] : value;
    }
    function joinLabels(labels) {
      if (labels.length < 2) return labels.join('');
      return labels.slice(0, -1).join(chinese ? '、' : ', ') + (chinese ? ' 和 ' : ' and ') + labels[labels.length - 1];
    }
    function formatDate(value) {
      if (!value) return '';
      var raw = String(value);
      var plainDate = /^\d{4}-\d{2}-\d{2}$/.test(raw);
      var date = new Date(plainDate ? raw + 'T00:00:00Z' : value);
      if (isNaN(date.getTime()) || plainDate && date.toISOString().slice(0, 10) !== raw) return raw;
      var options = { year: 'numeric', month: 'short', day: 'numeric' };
      // A verification date is a calendar date, not midnight in the reader's time zone.
      if (plainDate) options.timeZone = 'UTC';
      return date.toLocaleDateString(chinese ? 'zh-CN' : undefined, options);
    }
    return { text: text, joinLabels: joinLabels, formatDate: formatDate };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { create: create };
  else scope.AIFSCertificationUI = create(scope.document && scope.document.documentElement.lang);
}(typeof window !== 'undefined' ? window : globalThis));
