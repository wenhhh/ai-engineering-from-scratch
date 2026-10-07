// Minimal DOM for execution tests. No CSS layout, real browser, network or OS clipboard.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const site = path.resolve(__dirname, '..');
const decode = value => String(value).replace(/&(?:amp|lt|gt|quot|#39);/g, x => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[x]);
const encode = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[x]);
class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  async fire(name, event = {}) { for (const fn of [...(this.listeners.get(name) || [])]) await fn({ target: this, ...event }); }
}
class Element extends Events {
  constructor(tag, doc) { super(); this.tagName = tag; this.doc = doc; this.children = []; this.attributes = {}; this.style = {}; this._text = ''; this._value = ''; this.disabled = false; this.checked = false; this.hidden = false; this.open = false; this.parentNode = null; this.dataset = {}; }
  setAttribute(key, value) {
    this.attributes[key] = String(value);
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    if (key === 'value') this._value = String(value);
    if (key === 'class') this.className = String(value);
    if (key === 'lang') this.lang = String(value);
    if (['disabled','checked','hidden','open'].includes(key)) this[key] = true;
  }
  getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null; }
  removeAttribute(key) { delete this.attributes[key]; if (['disabled','checked','hidden','open'].includes(key)) this[key] = false; }
  toggleAttribute(key, enabled) { if (enabled) this.setAttribute(key, ''); else this.removeAttribute(key); }
  get value() { return this._value; } set value(v) { this._value = String(v); }
  get href() { return this.getAttribute('href') || ''; } set href(v) { this.setAttribute('href', v); }
  get src() { return this.getAttribute('src') || ''; } set src(v) { this.setAttribute('src', v); }
  get firstChild() { return this.children[0] || null; } get lastChild() { return this.children.at(-1) || null; }
  get isConnected() { return this.tagName === '#document' || !!this.parentNode?.isConnected; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._text + this.children.map(c => c.outerHTML).join(''); }
  set innerHTML(html) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = ''; parse(String(html), this, this.doc); }
  get outerHTML() {
    if (this.tagName === '#text') return encode(this._text);
    return '<' + this.tagName + Object.entries(this.attributes).map(([k,v]) => ' ' + k + '="' + encode(v) + '"').join('') + '>' + this.innerHTML + '</' + this.tagName + '>';
  }
  set outerHTML(html) {
    const parent = this.parentNode; if (!parent) return;
    const place = new Element('div', this.doc); place.innerHTML = html;
    for (const child of [...place.children]) parent.insertBefore(child, this);
    this.remove();
  }
  appendChild(child) { return this.insertBefore(child, null); }
  append(...children) { children.forEach(c => this.appendChild(c)); }
  insertBefore(child, before) {
    child.remove(); const index = before ? this.children.indexOf(before) : this.children.length;
    this.children.splice(index, 0, child); child.parentNode = this; this.onAppend?.(child); return child;
  }
  replaceChildren(...children) { for (const c of [...this.children]) c.remove(); this._text = ''; this.append(...children); }
  remove() { if (this.parentNode) { const p = this.parentNode; p.children.splice(p.children.indexOf(this), 1); this.parentNode = null; } }
  insertAdjacentElement(where, node) { if (where !== 'afterend') throw new Error('unsupported fixture insertion'); const p = this.parentNode; p.insertBefore(node, p.children[p.children.indexOf(this)+1] || null); }
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
    const match = selector.match(/^([a-z][\w-]*)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([^=\]]+)(?:=["']?([^\]"']*)["']?)?\])?$/i);
    if (!match) return false;
    const [,tag,id,cls,attr,value] = match;
    return (!tag || tag === this.tagName) && (!id || this.getAttribute('id') === id) && (!cls || String(this.className || this.getAttribute('class') || '').split(' ').includes(cls)) && (!attr || this.getAttribute(attr) !== null && (value === undefined || this.getAttribute(attr) === value));
  }
  closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
  querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  contains(node) { return node === this || this.children.some(c => c.contains(node)); }
  focus() { this.doc.activeElement = this; }
  select() { this.doc.selection = this.value; }
  click() { return this.fire('click'); }
  scrollIntoView(options) { this.scrollOptions = options; }
}
function parse(html, parent, doc) {
  const stack = [parent]; const voids = new Set(['meta','link','img','input','br','hr','source']);
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) || []) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { const name = token.slice(2,-1).trim(); const at = stack.findLastIndex(x => x.tagName === name); if (at > 0) stack.length = at; continue; }
    if (token.startsWith('<')) {
      const name = token.match(/^<([\w-]+)/)?.[1]; if (!name) continue;
      const node = new Element(name, doc);
      const attrs = token.slice(name.length + 1, -1);
      for (const m of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.setAttribute(m[1], decode(m[2] ?? m[3] ?? m[4] ?? ''));
      stack.at(-1).appendChild(node);
      if (!voids.has(name) && !token.endsWith('/>')) stack.push(node);
    } else { const text = new Element('#text', doc); text._text = decode(token); stack.at(-1).appendChild(text); }
  }
}
async function flush() { for (let i=0; i<8; i++) await Promise.resolve(); }
function setup({page='project',data={levels:[],projects:[],planned:[]},metadata=null,search='',language='zh-CN',source,fetcher,clipboard,legacyCopy=true,certificate=true,initialStorage={}}={}) {
  const document = new Events(); document.root = new Element('#document', document);
  document.root.innerHTML = fs.readFileSync(path.join(site, page === 'catalog' ? 'projects.html' : 'project.html'), 'utf8');
  document.documentElement = document.root.querySelector('html'); document.documentElement.lang = language;
  document.body = document.root.querySelector('body'); document.head = document.root.querySelector('head'); document.activeElement = null; document.hidden = false;
  document.getElementById = id => document.root.querySelector('#'+id);
  document.querySelectorAll = selector => document.root.querySelectorAll(selector);
  document.createElement = tag => new Element(tag, document);
  document.currentScript = {src:'http://127.0.0.1/site/projects.js?v=unit'};
  const copied = [], urls = [], loaded = [], downloads = [], fetches = [], mounts = [], timers = [];
  document.created = [];
  document.createElement = tag => { const node = new Element(tag, document); document.created.push(node); return node; };
  document.execCommand = command => { if (legacyCopy) copied.push(document.selection); return legacyCopy; };
  const window = new Events(); window.document = document; window.location = new URL('http://127.0.0.1/site/'+(page==='catalog'?'projects.html':'project.html')+search);
  window.matchMedia = () => ({matches:false}); window.AIFS_PROJECTS = data; window.__AIFS_TRANSLATION = metadata;
  window.mountLessonFigures = root => mounts.push(root); window.AIFSFigureRuntime = {disposeRoot() {}};
  const storage = new Map(Object.entries(initialStorage)); const history = {pushState(state, title, href) { urls.push({state,href}); window.location = new URL(href,window.location); }};
  document.head.onAppend = node => { if (node.tagName==='script' && node.onload) { loaded.push(node.src); queueMicrotask(() => node.onload()); } };
  const URLClass = class extends URL { static createObjectURL(blob) {downloads.push(blob); return 'blob:fixture';} static revokeObjectURL() {} };
  const context = {window, document, console, URL:URLClass, URLSearchParams, Blob, Map, Set, Promise, Number, String, Object, Array, Error, Date, JSON,
    history, localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    navigator:{clipboard:clipboard === undefined ? {writeText:async text=>copied.push(text)} : clipboard},
    setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){},
    fetch: url=>{fetches.push(url);return fetcher ? fetcher(url) : Promise.resolve({ok:true,text:()=>Promise.resolve('# 标题\n\n## 检查输入\n\n正文。\n\n```bash\npython3 example.py --check\n```')});}};
  vm.runInNewContext(fs.readFileSync(path.join(site,'project-ui.js'),'utf8'),context);
  if (certificate) vm.runInNewContext(fs.readFileSync(path.join(site,'project-certificates.js'),'utf8'),context);
  vm.runInNewContext(source || fs.readFileSync(path.join(site,'projects.js'),'utf8'),context);
  return {document,window,context,storage,copied,urls,loaded,downloads,fetches,mounts,timers,flush,main:document.getElementById('main')};
}
module.exports = {Events,Element,setup,flush,site};
