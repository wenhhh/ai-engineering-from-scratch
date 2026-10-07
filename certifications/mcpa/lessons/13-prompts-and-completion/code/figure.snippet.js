function promptTemplateFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>提示词模板与补全</strong> 参数填入模板，上下文缩小候选范围</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 300" role="img" aria-label="左侧：code_review 模板填入 language 和 framework 占位符，生成文本。右侧：framework 参数无上下文时有三个补全匹配，context.arguments 提供已选语言后缩小为两个。">',
    '<defs><marker id="l13arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="l13m"/></marker></defs>',
    '<style>.l13x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l13p{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.6}.l13t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l13c{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l13a{stroke:var(--blueprint,#3553ff);stroke-width:1.4;marker-end:url(#l13arrow)}.l13m{fill:var(--blueprint,#3553ff)}</style>',
    '<text class="l13c" x="14" y="18">prompts/get 渲染模板</text>',
    '<rect class="l13x" x="14" y="26" width="234" height="44"/>',
    '<text class="l13t" x="22" y="42">text: {language} 代码片段，</text>',
    '<text class="l13t" x="22" y="58">遵循 {framework} 风格</text>',
    '<line class="l13a" x1="131" y1="70" x2="131" y2="84"/>',
    '<rect class="l13x" x="14" y="86" width="234" height="44"/>',
    '<text class="l13t" x="22" y="102">language: python</text>',
    '<text class="l13t" x="22" y="118">framework: flask</text>',
    '<line class="l13a" x1="131" y1="130" x2="131" y2="144"/>',
    '<rect class="l13p" x="14" y="146" width="234" height="44"/>',
    '<text class="l13t" x="22" y="162">渲染：python 代码片段，</text>',
    '<text class="l13t" x="22" y="178">遵循 flask 风格</text>',
    '<text class="l13c" x="312" y="18">上下文缩小补全范围</text>',
    '<rect class="l13x" x="312" y="26" width="234" height="44"/>',
    '<text class="l13t" x="320" y="42">framework 为 "fa"，无上下文：</text>',
    '<text class="l13t" x="320" y="58">falcon, fastapi, fastify</text>',
    '<line class="l13a" x1="429" y1="70" x2="429" y2="84"/>',
    '<text class="l13c" x="366" y="80">+ 上下文</text>',
    '<rect class="l13p" x="312" y="86" width="234" height="44"/>',
    '<text class="l13t" x="320" y="102">language: python</text>',
    '<text class="l13t" x="320" y="118">缩小为：falcon, fastapi</text>',
    '<text class="l13c" x="312" y="146">匹配从 3 项减少为 2 项</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">提示词参数代入占位符，渲染 PromptMessage。completion/complete 对某个参数的建议排序；context.arguments 携带用户已有答案，例如已选语言后，可进一步缩小候选范围。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-13-prompt-template
