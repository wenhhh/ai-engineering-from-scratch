// Behavior fixture only: no layout, screen reader, remote fetch or real browser storage.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {Events, Element, flush} = require('./project-ui-dom.cjs');
const site = path.resolve(__dirname, '..');
const baseHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
// textContent->innerHTML follows browser text escaping; quotes are not attribute escaping.
Object.defineProperty(Element.prototype, 'innerHTML', {
  configurable:true,
  get() {return this._text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + this.children.map(c=>c.outerHTML).join('');},
  set:baseHTML.set,
});
Object.defineProperty(Element.prototype, 'classList', {
  get() {
    const self=this;
    const values=()=>new Set((self.getAttribute('class')||'').split(/\s+/).filter(Boolean));
    const store=xs=>self.setAttribute('class',[...xs].join(' '));
    return {contains:x=>values().has(x),add(...xs){const v=values();xs.forEach(x=>v.add(x));store(v);},
      remove(...xs){const v=values();xs.forEach(x=>v.delete(x));store(v);},
      toggle(x,force){const v=values(),yes=force===undefined?!v.has(x):!!force;yes?v.add(x):v.delete(x);store(v);return yes;}};
  },
});
const matches = Element.prototype.matches;
Element.prototype.matches=function(selector) {
  if(selector.endsWith(':checked'))return this.checked && matches.call(this,selector.slice(0,-8));
  return matches.call(this,selector);
};
function setup({page='catalog',data={programs:[],tracks:[],lessonsByPath:{},assessmentsById:{}},search='',language='zh-CN',locale=true,source,initialStorage={},storageUnavailable=false,completed=[],fetcher,now=1791345600000}={}) {
  const document=new Events();document.root=new Element('#document',document);
  const file={catalog:'certifications.html',track:'certification.html',assessment:'assessment.html'}[page]||'assessment.html';
  document.root.innerHTML=fs.readFileSync(path.join(site,file),'utf8');
  document.documentElement=document.root.querySelector('html');document.documentElement.lang=language;
  document.body=document.root.querySelector('body');document.body.setAttribute('data-cert-page',page);
  document.head=document.root.querySelector('head');document.readyState='complete';document.activeElement=null;
  document.getElementById=id=>document.root.querySelector('#'+id);
  document.querySelector=selector=>document.root.querySelector(selector);
  document.querySelectorAll=selector=>document.root.querySelectorAll(selector);
  document.createElement=tag=>new Element(tag,document);
  const window=new Events();window.document=document;window.location=new URL('http://127.0.0.1/site/'+file+search);
  window.matchMedia=()=>({matches:false});window.scrollTo=options=>scrolls.push(options);
  const storage=initialStorage instanceof Map?initialStorage:new Map(Object.entries(initialStorage));
  const localStorage={getItem(key){if(storageUnavailable)throw Error('fixture storage denied');return storage.get(key)??null;},
    setItem(key,v){if(storageUnavailable)throw Error('fixture storage denied');storage.set(String(key),String(v));},
    removeItem(key){if(storageUnavailable)throw Error('fixture storage denied');storage.delete(key);},
    key(i){return [...storage.keys()][i]??null;},get length(){return storage.size;}};
  const lessonListeners=[];const lessons=new Set(completed);
  window.AIFSProgress={isLessonComplete:p=>lessons.has(p),onChange:fn=>lessonListeners.push(fn)};
  window.AIFSContentSource={repoUrl:p=>'../'+p};
  const history=[],scrolls=[],timers=new Map(),fetches=[];let serial=0,clock=now;
  window.history={replaceState(state,title,url){history.push(url);window.location=new URL(url,window.location);}};
  class Clock extends Date {constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
  const context={window,document,localStorage,CERTIFICATIONS:data,PHASES:[],console,URL,URLSearchParams,Map,Set,Object,Array,Number,String,Boolean,JSON,Promise,Error,Date:Clock,
    setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id),
    fetch:url=>{fetches.push(url);return fetcher?fetcher(url):Promise.reject(Error('unregistered fixture fetch'));}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(site,'certification-progress.js'),'utf8'),context);
  if(locale)vm.runInContext(fs.readFileSync(path.join(site,'certification-ui.js'),'utf8'),context);
  vm.runInContext(source||fs.readFileSync(path.join(site,'certifications.js'),'utf8'),context);
  return {window,document,context,storage,history,scrolls,timers,fetches,flush,
    tick(ms=1000){clock+=ms;for(const fn of [...timers.values()])fn();},
    completeLesson(p){lessons.add(p);lessonListeners.forEach(fn=>fn());},
    async choose(questionId,choices){const form=document.getElementById('assessmentForm');const fields=form.querySelectorAll('input[data-question="'+questionId+'"]');
      for(const f of fields)f.checked=choices.includes(Number(f.value));
      for(const f of fields)if(f.checked||f.getAttribute('type')==='checkbox')await form.fire('change',{target:f});},
    async submit(){const form=document.getElementById('assessmentForm');await form.fire('submit',{preventDefault(){}});},
  };
}
module.exports={setup,Element,flush,site};
