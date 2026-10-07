// 本分支正文默认中文；英文选项只读取同步清单指定的上游原文。
(function () {
  'use strict';
  var wanted = 'zh-CN';
  try {
    var query = window.location && window.location.search || '';
    if (/(?:^|[?&])lang=en(?:&|$)/.test(query)) wanted = 'en';
  } catch (_) {}
  function current() { return wanted; }
  function applyDir() {
    document.documentElement.lang = current();
    document.documentElement.dir = 'ltr';
  }
  function englishUrl(relativePath) {
    if (wanted !== 'en') return null;
    var sync = window.__AIFS_TRANSLATION;
    if (!sync || !/^[a-f0-9]{40}$/.test(sync.upstreamCommit || '')) throw new Error('missing-pinned-upstream');
    if (typeof relativePath !== 'string' || !/^(phases|certifications|projects)\//.test(relativePath)
        || /[\\?#\x00]/.test(relativePath) || relativePath.split('/').some(function (part) { return part === '..' || part === '.'; })) {
      throw new Error('invalid-source-path');
    }
    return 'https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/'
      + sync.upstreamCommit + '/' + relativePath.split('/').map(encodeURIComponent).join('/');
  }
  window.AIFS_currentLang = current;
  window.AIFS_applyLangDir = applyDir;
  window.AIFS_englishSourceUrl = englishUrl;
  applyDir();
  function init() {
    var host = document.getElementById('langPicker');
    if (!host) return;
    host.textContent = '';
    host.style.display = '';
    var label = document.createElement('label');
    label.textContent = '正文语言：';
    var select = document.createElement('select');
    select.setAttribute('aria-label', '选择中文译文或固定版本的英文原文');
    [['zh-CN', '简体中文'], ['en', 'English（上游原文）']].forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0]; option.textContent = item[1]; select.appendChild(option);
    });
    select.value = wanted;
    select.addEventListener('change', function () {
      wanted = select.value === 'en' ? 'en' : 'zh-CN';
      applyDir();
      try {
        var url = new URL(window.location.href);
        if (wanted === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
        window.history.replaceState(null, '', url.href);
      } catch (_) {}
      if (typeof window.AIFS_onLangChange === 'function') window.AIFS_onLangChange(wanted);
      if (typeof window.CustomEvent === 'function') document.dispatchEvent(new CustomEvent('aifs:lang', { detail: { lang: wanted } }));
    });
    label.appendChild(select); host.appendChild(label);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
