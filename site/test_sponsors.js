const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = name => canonicalSponsorText(fs.readFileSync(path.join(root, name), 'utf8'));
const sponsorUrl = 'https://serpapi.com/ai-engineering-from-scratch';
const description = 'Web Search API for your AI apps. Available in Markdown and JSON for any integration.';
const tierLabel = /\b(?:Backer|Bronze|Silver|Gold|Platinum|Diamond|Title Partner)\b|青铜|白银|黄金|铂金|钻石|冠名合作伙伴/i;

// 只把已经逐项核对的中文文案映射到原始合同；URL、锚点和素材断言不变。
// 不使用模糊匹配，不能把缺失声明或改变后的赞助目标“归一化”为通过。
function canonicalSponsorText(text) {
  const copy = [
    ['### 赞助方（Sponsors）', '### Sponsors'],
    ['赞助我们', 'Sponsor us'],
    ['### 用同一套方法学习每一课（Use every lesson the same way）', '### Use every lesson the same way'],
    ['## 赞助商（Sponsor）', '## Sponsor'],
    ['## 如何赞助（How to sponsor）', '## How to sponsor'],
    ['## 赞助商（Sponsors）', '## Sponsors'],
    ['## 基础设施支持（Infrastructure Support）', '## Infrastructure support'],
    ['## 赞助项目（Sponsor the work）', '## Sponsor the work'],
    ['# 支持者（Backers）', '# Backers'],
    ['SerpApi：为 AI 应用提供网页搜索应用程序编程接口（Web Search API）。支持 Markdown 和 JSON 格式，可用于各种集成。', 'SerpApi. ' + description],
    ['面向 AI 应用的网页搜索接口（Web Search API），提供 Markdown 和 JSON 格式，便于集成。', description],
    ['面向 AI 应用的网页搜索 API（Web Search API），提供 Markdown 和 JSON 格式，便于接入各类系统。', description],
    ['感谢各位赞助方。', 'Thank you to our sponsors.'],
    ['成为赞助方', 'Become a sponsor'],
    ['Vercel 开源计划（Vercel Open Source Program）', 'Vercel Open Source Program'],
    [' 位读者', ' readers'],
    ['赞助信息的变更不接受贡献者通过拉取请求提交。', 'Sponsorship changes are not accepted through contributor pull requests.'],
    ['赞助商名称、标识、链接与赞助等级由维护者管理。', 'names, logos, links, and tier assignments are managed by the maintainer.'],
    ['赞助商名称、标志、链接及档位由维护者管理，不接受贡献者通过拉取请求（Pull Request）修改赞助信息。', 'names, logos, links, and tier assignments are managed by the maintainer. Sponsorship changes are not accepted through contributor pull requests.'],
  ];
  for (const [localized, canonical] of copy.sort((a, b) => b[0].length - a[0].length)) {
    text = text.replaceAll(localized, canonical);
  }
  return text;
}

test('Chinese sponsor-copy normalization preserves destinations and rejects altered policy text', () => {
  const localized = '<a href="SPONSORS.md">成为赞助方</a>';
  assert.equal(canonicalSponsorText(localized), '<a href="SPONSORS.md">Become a sponsor</a>');
  assert.equal(canonicalSponsorText(localized.replace('SPONSORS.md', 'MISSING.md')), '<a href="MISSING.md">Become a sponsor</a>');
  assert.equal(canonicalSponsorText('<a id="supporters"></a>'), '<a id="supporters"></a>');
  assert.equal(canonicalSponsorText('Sponsorship changes are not accepted through contributor pull requests.'), 'Sponsorship changes are not accepted through contributor pull requests.');
  assert.ok(!canonicalSponsorText('赞助信息的变更接受贡献者通过拉取请求提交。').includes('not accepted'));
  assert.ok(!canonicalSponsorText('赞助商名称、标识、链接与赞助等级由贡献者管理。').includes('managed by the maintainer'));
  assert.match('黄金', tierLabel);
  assert.doesNotMatch('查看所有支持者', tierLabel);
});

function between(text, start, end, file) {
  const section = text.split(start)[1];
  assert.ok(section, `${file} is missing ${start.trim()}`);
  const placement = section.split(end)[0];
  assert.notEqual(placement, section, `${file} is missing ${end.trim()}`);
  return placement;
}

test('sponsor placement uses approved artwork and destination without a tier label', () => {
  const placements = [
    ['README.md', '### Sponsors\n', '### Use every lesson the same way'],
    ['SPONSORS.md', '## Sponsor\n', '## How to sponsor'],
    ['BACKERS.md', '## Sponsors\n', '## Infrastructure support'],
  ];
  for (const [file, start, end] of placements) {
    const text = read(file);
    const placement = between(text, start, end, file);
    assert.ok(placement.includes(description), file);
    assert.doesNotMatch(placement, tierLabel, file);
    assert.doesNotMatch(text, /serpapi\.com\/\?utm_/);
  }
  const sponsors = read('SPONSORS.md');
  assert.ok(sponsors.includes(`href="${sponsorUrl}"`));
  assert.match(sponsors, /media="\(prefers-color-scheme: dark\)" srcset="https:\/\/serpapi\.com\/assets\/media_kit\/logo-with-wordmark-white\.svg"/);
  assert.match(sponsors, /<img src="https:\/\/serpapi\.com\/assets\/media_kit\/logo-with-wordmark\.svg" alt="SerpApi" width="180">/);
  const readme = read('README.md');
  const placement = between(readme, '### Sponsors\n', '### Use every lesson the same way', 'README.md');
  const banner = `<a href="${sponsorUrl}">\n  <img align="left" src="assets/sponsors/serpapi-banner.png" alt="SerpApi. ${description}" width="600">\n</a>`;
  assert.ok(placement.includes(banner));
  assert.ok(placement.includes('Thank you to our sponsors.'));
  assert.ok(placement.includes('href="#supporters"'));
  assert.ok(placement.includes('href="SPONSORS.md"'));
  assert.ok(placement.includes('<br clear="all">'));
  assert.ok(readme.includes('\n## Sponsor the work\n'));
  const image = fs.readFileSync(path.join(root, 'assets/sponsors/serpapi-banner.png'));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 2172);
  assert.equal(image.readUInt32BE(20), 724);
  assert.doesNotMatch(readme, /### Current sponsors|\| Tier \|/);
  assert.match(readme, /<p align="center"><sub><b>[\d,]+<\/b> readers/);
});

test('backer listings are reachable and preserve existing supporters', () => {
  for (const file of ['README.md', 'SPONSORS.md']) {
    assert.match(read(file), /\[[^\]]+\]\(BACKERS\.md\)/, file);
  }
  const backers = read('BACKERS.md');
  assert.match(backers, /^# Backers\n/);
  assert.ok(backers.includes(`[SerpApi](${sponsorUrl})`));
  assert.ok(backers.includes('[SPONSORS.md](SPONSORS.md)'));
  for (const name of ['CodeRabbit', 'iii', 'Vercel Open Source Program']) {
    assert.ok(backers.includes(`[${name}](https://`), name);
  }
  for (const [, destination] of backers.matchAll(/\]\(([^)]+)\)/g)) {
    if (destination.startsWith('https://')) {
      assert.equal(new URL(destination).protocol, 'https:', destination);
    } else {
      assert.ok(fs.statSync(path.join(root, destination)).isFile(), destination);
    }
  }
});

test('supporter navigation survives translated README headings', () => {
  const translations = fs.readdirSync(path.join(root, 'i18n'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join('i18n', entry.name, 'README.md'));
  assert.ok(translations.length > 0);
  for (const file of ['README.md', ...translations]) {
    const text = read(file);
    assert.ok(text.includes('href="#supporters"'), file);
    assert.ok(text.includes('<a id="supporters"></a>'), file);
    const sponsorLink = text.match(/href="([^"]*SPONSORS\.md)">Become a sponsor/);
    assert.ok(sponsorLink, file);
    assert.equal(path.resolve(root, path.dirname(file), sponsorLink[1]), path.join(root, 'SPONSORS.md'), file);
    assert.equal((text.match(/>Become a sponsor<\/a>/g) || []).length, 1, file);
    if (file !== 'README.md') {
      // Residue is checked on the displayed source, not text deliberately translated back for contract comparison.
      assert.doesNotMatch(
        fs.readFileSync(path.join(root, file), 'utf8'),
        /### Sponsors|Thank you to our sponsors\.|Your support keeps every lesson free and open source\.|See all supporters|SerpApi\. Web Search API|## Sponsor the work|Free, MIT-licensed, 523 lessons\.|See all sponsors and backers|Want to support the work\?/
      );
    }
  }
});

test('sponsors page is rendered from SPONSORS.md at build time', () => {
  const { renderSponsorsMarkdown } = require('./build.js');
  const page = fs.readFileSync(path.join(root, 'site/sponsors.html'), 'utf8');
  const generated = between(page, '<!-- GENERATED:SPONSORS:START -->\n', '\n          <!-- GENERATED:SPONSORS:END -->', 'site/sponsors.html');
  assert.equal(generated, renderSponsorsMarkdown(fs.readFileSync(path.join(root, 'SPONSORS.md'), 'utf8')));
  assert.match(generated, /^<h1 id="sponsorship">(?:Sponsorship|赞助（Sponsorship）)<\/h1>/);
  for (const anchor of ['hardware-lab-partner', 'hard-rules', 'pricing-anchors']) {
    assert.ok(generated.includes(`id="${anchor}"`), anchor);
    assert.ok(generated.includes(`href="#${anchor}"`), anchor);
  }
  assert.ok(generated.includes(`<a href="${sponsorUrl}" target="_blank" rel="noopener"><picture><source media="(prefers-color-scheme: dark)" srcset="https://serpapi.com/assets/media_kit/logo-with-wordmark-white.svg">`));
  assert.ok(generated.includes('href="https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/BACKERS.md" target="_blank" rel="noopener"'));
  assert.ok(generated.includes('<td class="align-right">114,584 (+4%)</td>'));
  assert.match(generated, /<li><strong>(?:Open-source baseline|开源项目基准)<\/strong>/);
  assert.doesNotMatch(generated, /\n\s*\[Babel\]/);
});

test('sponsor markdown keeps only allowlisted HTML and safe links', () => {
  const { renderSponsorsMarkdown } = require('./build.js');
  const html = renderSponsorsMarkdown([
    '<img src="https://example.com/logo.svg" onerror="alert(1)" alt="Logo" width="120">',
    '<script>alert(1)</script> <a href="javascript:alert(1)">bad</a>',
    '[plain](javascript:alert) [parent](../secret.md) [anchor](#tiers)',
  ].join('\n'));
  assert.ok(html.includes('<img src="https://example.com/logo.svg" alt="Logo" width="120">'));
  assert.doesNotMatch(html, /<script|<a href="javascript|onerror|href="[^"]*\.\./);
  assert.equal((html.match(/<a /g) || []).length, (html.match(/<\/a>/g) || []).length);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('bad&lt;/a&gt;'));
  assert.ok(html.includes('plain parent <a href="#tiers">anchor</a>'));
});

test('the hamburger menu and every page footer link to the sponsors page', () => {
  const pages = fs.readdirSync(path.join(root, 'site')).filter(name => name.endsWith('.html'));
  let footers = 0;
  for (const page of pages) {
    const text = read(path.join('site', page));
    if (!text.includes('<div class="footer-links">')) continue;
    footers++;
    const links = between(text, '<div class="footer-links">', '</div>', page);
    assert.ok(links.includes('<a href="sponsors.html">Sponsor us</a>'), page);
  }
  assert.ok(footers >= 13);
  assert.ok(read('site/header.js').includes("ensureNavigationLink(nav, 'sponsors.html', 'Sponsor us', 'header-mobile-only');"));
  assert.ok(JSON.parse(read('site/ui-strings.json')).keys.includes('Sponsor us'));
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some(rule => rule.source === '/sponsors' && rule.destination === '/sponsors.html'));
});

test('sponsor changes are reserved for maintainers', () => {
  for (const file of ['CONTRIBUTING.md', 'SPONSORS.md']) {
    const text = read(file).replace(/\s+/g, ' ');
    assert.ok(text.includes('Sponsorship changes are not accepted through contributor pull requests.'), file);
    assert.ok(text.includes('names, logos, links, and tier assignments are managed by the maintainer.'), file);
  }
});

// Canonicalization serves contract comparisons; it must not fabricate locale residue.
test('locale residue checks use actual translated text and still detect English', () => {
  const localized = '### 赞助方（Sponsors）\n感谢各位赞助方。';
  const untranslated = /### Sponsors|Thank you to our sponsors\./;
  assert.doesNotMatch(localized, untranslated);
  assert.match(canonicalSponsorText(localized), untranslated);
  assert.match('### Sponsors\n感谢各位赞助方。', untranslated);
  const actual = fs.readFileSync(path.join(root, 'i18n/zh/README.md'), 'utf8');
  assert.doesNotMatch(actual, untranslated);
  assert.match(actual, /href="\.\.\/\.\.\/SPONSORS\.md"/);
});
