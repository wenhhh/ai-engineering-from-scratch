/**
 * 文档查看器回归测试。
 * 仅翻译名称与说明；断言、匹配正则、夹具标题与输入保持原样。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES, getFixture, listFixtures } from "../src/fixtures.js";

describe("文档夹具", () => {
  it("提供 10-K 与 Nature 演示夹具", () => {
    const ids = listFixtures().map((d) => d.id).sort();
    assert.deepEqual(ids, ["10k-acme-2025", "nature-paper-2026"]);
  });

  it("getFixture 返回已知文档", () => {
    const doc = getFixture("10k-acme-2025");
    assert.ok(doc);
    assert.equal(doc.title, "Acme 10-K FY2025, Table 4");
    assert.equal(doc.pageWidth, 1224);
    assert.ok(doc.evidence.length >= 1);
  });

  it("getFixture 对未知 ID 返回 undefined", () => {
    assert.equal(getFixture("missing-doc-id"), undefined);
  });

  it("每个引用区域的边界框面积为正，得分位于 [0,1]", () => {
    for (const doc of Object.values(FIXTURES)) {
      for (const e of doc.evidence) {
        assert.ok(e.bbox.w > 0 && e.bbox.h > 0, `bbox area must be > 0 in ${doc.id}`);
        assert.ok(e.score >= 0 && e.score <= 1, `score out of range in ${doc.id}`);
      }
    }
  });
});
