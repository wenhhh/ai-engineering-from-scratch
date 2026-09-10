/**
 * 文档查看器回归测试。
 * 仅翻译名称与说明；断言、匹配正则、夹具标题与输入保持原样。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, renderDocument, renderIndex } from "../src/render.js";
import { getFixture } from "../src/fixtures.js";

describe("escapeHtml", () => {
  it("转义五种需要 HTML 转义的字符", () => {
    assert.equal(escapeHtml("<a href=\"x\">'&\"</a>"), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&quot;&lt;/a&gt;");
  });

  it("无需转义时原样返回输入", () => {
    assert.equal(escapeHtml("hello world"), "hello world");
  });
});

describe("renderIndex", () => {
  it("列出两个文档夹具的链接", () => {
    const html = renderIndex();
    assert.match(html, /<a href="\/document\/10k-acme-2025">/);
    assert.match(html, /<a href="\/document\/nature-paper-2026">/);
    assert.match(html, /Capstone 04 viewer/);
  });
});

describe("renderDocument", () => {
  it("内嵌用于画布覆盖层绘制的 JSON 载荷", () => {
    const doc = getFixture("10k-acme-2025");
    assert.ok(doc);
    const html = renderDocument(doc);
    assert.match(html, /const DATA = \{/);
    assert.match(html, /"pageWidth":1224/);
    assert.match(html, /<canvas class="overlay"/);
  });

  it("对测试样本的标题与问题内容进行转义", () => {
    const html = renderDocument({
      id: "x",
      title: "<script>alert(1)</script>",
      pageWidth: 100,
      pageHeight: 100,
      pageImageUrl: "/static/x.png",
      query: "q?",
      answer: "a.",
      evidence: [],
    });
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });

  it("对问题字段中的测试脚本标签进行转义", () => {
    const html = renderDocument({
      id: "y",
      title: "ok",
      pageWidth: 100,
      pageHeight: 100,
      pageImageUrl: "/static/y.png",
      query: "<script>alert(2)</script>",
      answer: "a.",
      evidence: [],
    });
    assert.ok(!html.includes("<script>alert(2)</script>"));
    assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  });
});
