// This branch serves its own Chinese source, never the upstream translations branch.
(function () {
  'use strict';
  function current() { return 'zh-CN'; }
  function applyDir() {
    document.documentElement.lang = current();
    document.documentElement.dir = 'ltr';
  }
  window.AIFS_currentLang = current;
  window.AIFS_applyLangDir = applyDir;
  applyDir();
  function init() {
    var host = document.getElementById('langPicker');
    if (!host) return;
    host.textContent = '简体中文';
    host.setAttribute('aria-label', '当前版本语言：简体中文');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
