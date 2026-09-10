/**
 * 代码库 RAG 的回归测试。
 * 仅翻译测试名称与本说明；查询夹具、断言、错误诊断和预期数值不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { BM25Index, DenseIndex, cosine, fakeEmbed, fnv1a, tokenize } from "../src/index_store.ts";
import { SAMPLE_CORPUS } from "../src/corpus.ts";
import { anchor } from "../src/types.ts";

test("tokenize：转为小写并按分词规则提取词项", () => {
  assert.deepEqual(tokenize("Abort-Multipart_Upload!"), ["abort", "multipart_upload"]);
});

test("fnv1a：产生确定性的 32 位无符号输出", () => {
  const a = fnv1a("hello");
  const b = fnv1a("hello");
  assert.equal(a, b);
  assert.ok(a >= 0 && a <= 0xffffffff);
});

test("fakeEmbed：非空样本返回单位向量", () => {
  const v = fakeEmbed("authorization opa check");
  let norm = 0;
  for (const x of v) norm += x * x;
  assert.ok(Math.abs(Math.sqrt(norm) - 1.0) < 1e-9);
});

test("cosine：相同非零向量的相似度为 1.0", () => {
  const v = fakeEmbed("rank fusion");
  assert.ok(Math.abs(cosine(v, v) - 1.0) < 1e-9);
});

test("BM25Index：授权查询优先于不相关的 S3 分块", () => {
  const bm25 = new BM25Index();
  for (const c of SAMPLE_CORPUS) bm25.add(c);
  const hits = bm25.search("authorization check");
  assert.ok(hits.length > 0);
  const topAnchor = anchor(hits[0].chunk);
  assert.ok(
    topAnchor.startsWith("auth/"),
    `expected an auth/* chunk on top, got ${topAnchor}`,
  );
});

test("DenseIndex：按余弦得分降序返回前 k 项", () => {
  const dense = new DenseIndex();
  for (const c of SAMPLE_CORPUS) dense.add(c);
  const hits = dense.search("multipart upload abort", 3);
  assert.equal(hits.length, 3);
  for (let i = 1; i < hits.length; i++) {
    assert.ok(hits[i - 1].score >= hits[i].score);
  }
});
