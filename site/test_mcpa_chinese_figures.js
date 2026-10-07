// MCPA 03–33: mount the real runtime and reference snippets without a browser.
// These checks protect SVG structure and animation attributes, not pixel layout.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_COMMIT = 'c02ca08d8a49ce24c3c1c1cf8e3b422f2c7393ca';
const FIGURES = [
  ['03-json-rpc-and-meta', 'mcpa-03-envelope', 'envelopeFigure'],
  ['04-the-stateless-core', 'mcpa-04-stateless-requests', 'statelessRequestsFigure'],
  ['05-protocol-eras-and-compatibility', 'mcpa-05-era-matrix', 'eraMatrixFigure'],
  ['06-hosts-clients-and-servers', 'mcpa-06-topology', 'topologyFigure'],
  ['07-discovery-and-capability-negotiation', 'mcpa-07-discover', 'discoverCapabilityFigure'],
  ['08-tool-schemas-and-structured-content', 'mcpa-08-schema-contract', 'schemaContractFigure'],
  ['09-reading-server-manifests', 'mcpa-09-manifest-anatomy', 'manifestAnatomyFigure'],
  ['10-model-interaction-flow', 'mcpa-10-interaction-flow', 'modelInteractionFlowFigure'],
  ['11-the-tools-primitive', 'mcpa-11-tool-call', 'toolCallFigure'],
  ['12-the-resources-primitive', 'mcpa-12-resource-read', 'resourceReadFigure'],
  ['13-prompts-and-completion', 'mcpa-13-prompt-template', 'promptTemplateFigure'],
  ['14-multi-round-trip-requests-and-elicitation', 'mcpa-14-mrtr', 'mrtrFigure'],
  ['15-deprecated-client-features', 'mcpa-15-deprecation-timeline', 'deprecationTimelineFigure'],
  ['16-notifications-and-subscriptions', 'mcpa-16-subscription-stream', 'subscriptionStreamFigure'],
  ['17-tool-invocation-lifecycle', 'mcpa-17-lifecycle', 'toolLifecycleFigure'],
  ['18-error-handling', 'mcpa-18-error-taxonomy', 'errorTaxonomyFigure'],
  ['19-transports-and-http-headers', 'mcpa-19-transports', 'transportsFigure'],
  ['20-caching-and-pagination', 'mcpa-20-cache-freshness', 'cacheFreshnessFigure'],
  ["21-long-running-work-and-tasks", "mcpa-21-task-states", "taskStateLifecycleFigure"],
  ["22-trust-boundaries", "mcpa-22-trust-zones", "trustZonesFigure"],
  ["23-oauth-authorization", "mcpa-23-oauth-flow", "oauthFlowFigure"],
  ["24-client-registration-and-identity", "mcpa-24-registration-paths", "registrationPathsFigure"],
  ["25-consent-and-least-privilege", "mcpa-25-consent-gates", "consentGatesFigure"],
  ["26-risk-and-safety-controls", "mcpa-26-attack-surface", "attackSurfaceFigure"],
  ["27-auditability-and-observability", "mcpa-27-trace-propagation", "tracePropagationFigure"],
  ["28-roles-and-adoption", "mcpa-28-roles-map", "rolesMapFigure"],
  ["29-operational-use-cases", "mcpa-29-use-case-matrix", "useCaseMatrixFigure"],
  ["30-the-extensions-framework", "mcpa-30-extension-negotiation", "extensionNegotiationFigure"],
  ["31-mcp-apps", "mcpa-31-app-sandbox", "appSandboxFigure"],
  ["32-registry-gateways-and-sdk-tiers", "mcpa-32-registry-flow", "registryGatewayFigure"],
  ["33-mcpa-capstone-readiness", "mcpa-33-capstone-flow", "capstoneFlowFigure"],
];
const EXPECTED_LAYOUTS = {
  "mcpa-03-envelope": {
    "runtime": "1664b3d8fb07d95f9e71022237ea10221836a1c9b15d38edea8808e2e5ebe41f",
    "snippet": "919fdcb908257d4423e266170a6b02d1e59bfc4d31574760a8743a76d064f55f"
  },
  "mcpa-04-stateless-requests": {
    "runtime": "56173955ac09bd79074af5c1285fbb2e9c541120ba0e288f52f8130057384e3a",
    "snippet": "550ba26bc287e74ac8c10d20515a75e3af6f02dd8576bf03d80bfd5b6e9495b9"
  },
  "mcpa-05-era-matrix": {
    "runtime": "7f867eda0b99971ad649e4725352df5a7f55811a059b231cd3d25246f57ece83",
    "snippet": "ff40f1fd61da4dfbe6e09cb4516fffde3617995c158ec31e4321fd7c9cd9d18e"
  },
  "mcpa-06-topology": {
    "runtime": "60f7b7bad10a07f4dfaaafe1dca433f40c302ea4182f0f194c8181d9ff473b60",
    "snippet": "cb2a12ad9b5321b8b921d1306ef52593b6b886a1da760e38c3867d6bc42490f0"
  },
  "mcpa-07-discover": {
    "runtime": "febfe58c71697b20356058b89ddc23d914ea48bc77187b2ce31b38a78c16d3c4",
    "snippet": "373ea0b55f020b14498c76e165459564673230afc86c585f0066f2f79f67639a"
  },
  "mcpa-08-schema-contract": {
    "runtime": "939ca4ebf83ccebb87f1f7e9092dfd4499127b1a561327b62bd3eb4a362d6c1a",
    "snippet": "daf3b87d33fc6538a6e93c49528bec9ade91a456f85762d304ac348a12294483"
  },
  "mcpa-09-manifest-anatomy": {
    "runtime": "ddc5c1fd0ad2767e4a778cef939fe22c4867b465aabc9a948e7eeca94af0561d",
    "snippet": "f18de3327e4efc69a0b109419c0513149cabc0614093bc297f0840bcd08d431d"
  },
  "mcpa-10-interaction-flow": {
    "runtime": "5b6f9db94901ee7af7128a41839b889257cd497584a9e37237f10bd5a09f98d2",
    "snippet": "cf7af1bbd533184d3c2d68188ca2660ff5d5fc6789918d916ca2387dc99f83b6"
  },
  "mcpa-11-tool-call": {
    "runtime": "5ee88106a405077e142cc9f90dfe40bc272f0389024db92eab233abe3ebc8c2c",
    "snippet": "8c5701cf7374478d3d21d35900e4aa037e99cb8011955d70385735a671bb523c"
  },
  "mcpa-12-resource-read": {
    "runtime": "29fbe4166925979c81c68a13a8a223bf8e8fdfc160d65e99b5f720ff3e67ca53",
    "snippet": "a44724a1c82cc82ae2702192e771e5fd5d3b8e3b8e7d14a1eb42fdf262977579"
  },
  "mcpa-13-prompt-template": {
    "runtime": "c127aff2b2e2dde55155f84d2fb3d1f23a56e45fd91bb3fbfe683fc29720b50d",
    "snippet": "740ad551a9f31f7807626c821d32276d70fd29eb4193b33bda76ced3ae65d9b5"
  },
  "mcpa-14-mrtr": {
    "runtime": "45152e19a720157f8d46ee26a42e7b7ee9643a957b153b6f760067846f0a5034",
    "snippet": "8aaf648479755a7d55831380a9a61eb2ed514dc06ed12d939424aa5efa6aae2c"
  },
  "mcpa-15-deprecation-timeline": {
    "runtime": "24aca2f03f3380e49544884314793b8d220ab81c5cb9409342a93824683ee08f",
    "snippet": "9f013d6ca489ab3f8d536875d2572977d051c874ff21fa1e4f9f2ee5854fe86b"
  },
  "mcpa-16-subscription-stream": {
    "runtime": "032fc802f9e4ebf4a279d4632e04e994df1f2592c9df4a1f07fd6a4cf855c653",
    "snippet": "142d35c35dd6d513b4c9101576eae548639e581fe3abfe9ba1f793cbfce16594"
  },
  "mcpa-17-lifecycle": {
    "runtime": "86a5fcbaccf6d20f15ef4d3c21f43e35c4e19eb8af6d4061e360c49929d37099",
    "snippet": "7f77ef88e12724fe93c1ac7fda8059a0073d4ff6d27087846d0c4709b72fbd90"
  },
  "mcpa-18-error-taxonomy": {
    "runtime": "c02c876385a5d5bf7c73d80b82468ca32c5ab8d9c7d3bd348b93c1c21ba05f85",
    "snippet": "920b3a235a61ccaac9d03ae5718c1ffa9f90c628ee66c8e5d68a0231a76f6bb0"
  },
  "mcpa-19-transports": {
    "runtime": "103d59283af1fbf3c8a83bc4bc807a4b93f4fffecf41894cf4ee23b30f7f8b52",
    "snippet": "a5475c9f51d6097297f31a0787974d8fe6f27b99b4f382c5ae7c65dbbc0a3c10"
  },
  "mcpa-20-cache-freshness": {
    "runtime": "b89d36e21c4c9ba704aa4b075ed479551cb70029f704d5803c99a2c8a0ede409",
    "snippet": "bef5064c2706b5fe0dcbe0eb97471f5ba7607d4004e2566bd1cfd2112ea192b7"
  },
  "mcpa-21-task-states": {
    "runtime": "675e2b14dc58f8dadb7f31dad5004b084bb8cf037b22f9e02c33f1eba0f36ae0",
    "snippet": "1a1ba17cc1c0a57123f3af2a2c0c594a537818fb84a305d7176e00f0e49321d3"
  },
  "mcpa-22-trust-zones": {
    "runtime": "c74c5fbca6a8b10edbcbf0306314657449fff74f8ac1d5893efb28b6c8644d03",
    "snippet": "7e71d5887dddd9b2c5b653c9f6ac5b686b7ff4fa3162c5cd7379baa5dda84815"
  },
  "mcpa-23-oauth-flow": {
    "runtime": "dd52a6bf0b8129e54cb577e479795803324e60f89351bab6235689a6e30352df",
    "snippet": "ecc51703ed3d0505561bc64578e890af1c2f790271de7c45462aaffcc2cdfcf6"
  },
  "mcpa-24-registration-paths": {
    "runtime": "34a4eb4d42018d1e14c5c78c2be2c0af3f30e5414c0a40a90cb4c208000cbffe",
    "snippet": "a961cb2a0fca9dcfd68786497911d775decd5104b800aed0a69280a67c087c7e"
  },
  "mcpa-25-consent-gates": {
    "runtime": "b3c1fc24d05f29edec6c34d53c0cbc36692595a9d72f290ffb1721afc7711e70",
    "snippet": "600adc7719c3e6b8442880c07337cf6090e1b3041055a08d859f6d4b94e31fed"
  },
  "mcpa-26-attack-surface": {
    "runtime": "dfc766b35e9e5eb3c6d7c072e83fae0d69ac17a94a3cfab49e7a63538d8423e6",
    "snippet": "131456148ce58969dab0862eff3711da6f6d96120ba1d09a01ff43a4bf193f11"
  },
  "mcpa-27-trace-propagation": {
    "runtime": "91d05f9ff57ae96adcd324ccf0fc0b64703ebe95ce072173d422ffef0222c214",
    "snippet": "6bedbf91a347df2e61ea27e207a138b1a450c32e9c05732d5b531e48af5c2cf3"
  },
  "mcpa-28-roles-map": {
    "runtime": "2da0eb0349a82eb34d5c4ccfad6d22df5806437986fccdfe025a616bed3a6ee9",
    "snippet": "a823f6c76da37008359c633a64a3f462454f1c22d1eaad22824731b223fa4561"
  },
  "mcpa-29-use-case-matrix": {
    "runtime": "1e21598bce1bc9621e9b55bbe0347e4ce56602d55dcc9bbf6827aab1b46bf352",
    "snippet": "1436684d269f53bbeb680ce5532e6899f9839bb0469aeec62527159c94b923c2"
  },
  "mcpa-30-extension-negotiation": {
    "runtime": "24cdecf83a2026f908c992d7795d9edf62e43d6af35c6c98e0ae758d7d997f38",
    "snippet": "9d57cc5cb44fa579f302c7a0c3586c8574e471a66b6dd3c03350d99ace62d97f"
  },
  "mcpa-31-app-sandbox": {
    "runtime": "78dab97b120bbbf30055a3c1ae54e66adaea9d6c83635147334d013a1940f3a3",
    "snippet": "4f051289577790a3727e3cfeb08e082e2470f047a94bcd1129ff3c7b7340ce59"
  },
  "mcpa-32-registry-flow": {
    "runtime": "cab75b632d3efe12992a68026da3ad7c0a3e4f51dde5e9d7980079998a1be38b",
    "snippet": "92c7b2c7bd4873ef8451ee656489110b0c8af4e1634395d193d7ed8232ae15e8"
  },
  "mcpa-33-capstone-flow": {
    "runtime": "eaebbce8c521a1f55f5bf6e4126d1c78fdc3c6ff1d7b9c56ae4f6e45cf00a5ea",
    "snippet": "868679484c03c4014d9ba37db488efa4743e61d568a9ea7eaa10a5b21b61592a"
  }
};

class Element {
  constructor(tag, text = '') { this.tag = tag; this.text = text; this.attrs = {}; this.children = []; this.innerHTML = ''; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  insertBefore(child, before) {
    const i = this.children.indexOf(before);
    if (i < 0) return this.appendChild(child);
    this.children.splice(i, 0, child);
    return child;
  }
  get firstChild() { return this.children[0] || null; }
}
function environment() {
  const registry = {};
  const head = new Element('head');
  const textNode = text => new Element('#text', String(text));
  const make = (tag, attrs = {}, children = []) => {
    const node = new Element(tag);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    for (const child of children || []) node.appendChild(typeof child === 'string' ? textNode(child) : child);
    return node;
  };
  const document = { head, createElement: tag => make(tag), createTextNode: textNode, getElementById: () => null };
  const LF = { el: make, svgEl: make, register: entries => Object.assign(registry, entries) };
  return { context: { window: { LF }, document, ensureStyles() {} }, registry };
}
function structural(node) {
  if (node.tag === '#text') return { tag: '#text' };
  const attrs = Object.fromEntries(Object.entries(node.attrs).filter(([key]) => !['aria-label', 'title'].includes(key)).sort());
  return { tag: node.tag, attrs, children: node.children.map(structural) };
}
function textOf(node) { return node.text + node.children.map(textOf).join(' '); }
function sha(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function runtimeSnapshot(source, id) {
  const env = environment();
  vm.runInNewContext(source, env.context, { timeout: 2000 });
  assert.equal(typeof env.registry[id], 'function', id);
  const host = new Element('host');
  env.registry[id](host);
  assert.ok(host.children.length > 0, id);
  return { hash: sha(JSON.stringify(structural(host))), text: textOf(host) };
}
function snippetSnapshot(source, functionName) {
  const env = environment();
  vm.runInNewContext(source, env.context, { timeout: 2000 });
  const host = new Element('host');
  env.context[functionName](host);
  assert.equal(host.children.length, 1);
  const html = host.children[0].innerHTML;
  const svg = html.match(/<svg\b[\s\S]*?<\/svg>/);
  assert.ok(svg, functionName);
  const geometry = svg[0]
    .replace(/\saria-label="[^"]*"/g, '')
    .replace(/(<(?:text|title|desc)\b[^>]*>)[\s\S]*?(<\/(?:text|title|desc)>)/g, '$1$2');
  return { hash: sha(geometry), text: html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, '') };
}
// Explicit maintenance mode records only the immutable upstream, never current output.
if (process.argv.includes('--record-upstream-layouts')) {
  const source = file => cp.execFileSync('git', ['show', `${SOURCE_COMMIT}:${file}`], { cwd: ROOT, encoding: 'utf8' });
  const runtime = source('site/figures-mcpa-certifications.js');
  const layouts = {};
  for (const [slug, id, fn] of FIGURES) {
    layouts[id] = {
      runtime: runtimeSnapshot(runtime, id).hash,
      snippet: snippetSnapshot(source(`certifications/mcpa/lessons/${slug}/code/figure.snippet.js`), fn).hash,
    };
  }
  console.log(JSON.stringify(layouts, null, 2));
} else {
  const runtime = fs.readFileSync(path.join(__dirname, 'figures-mcpa-certifications.js'), 'utf8');
  for (const [slug, id, fn] of FIGURES) {
    test(`${id}: Chinese runtime keeps upstream geometry and animation`, () => {
      const result = runtimeSnapshot(runtime, id);
      assert.equal(result.hash, EXPECTED_LAYOUTS[id].runtime);
      assert.match(result.text, /[\u3400-\u9fff]/);
    });
    test(`${id}: Chinese snippet keeps upstream SVG geometry`, () => {
      const file = path.join(ROOT, 'certifications/mcpa/lessons', slug, 'code/figure.snippet.js');
      const result = snippetSnapshot(fs.readFileSync(file, 'utf8'), fn);
      assert.equal(result.hash, EXPECTED_LAYOUTS[id].snippet);
      assert.match(result.text, /[\u3400-\u9fff]/);
    });
  }
}
