/**
 * 文档查看器的固定演示夹具，不代表真实公司财报、Nature 论文或性能测量。
 * 页面尺寸、引用框、得分、文件标识、英文标题及证据摘录保持原样；只翻译展示问答。
 * pageImageUrl 是占位路径，本例未提供相应图片路由。
 */

import type { DocumentFixture } from "./types.js";

export const FIXTURES: Record<string, DocumentFixture> = {
  "10k-acme-2025": {
    id: "10k-acme-2025",
    // 标题：Acme 2025 财年 10-K 报告，表四；英文标题是测试断言与原文标识，保留原值。
    title: "Acme 10-K FY2025, Table 4",
    pageWidth: 1224,
    pageHeight: 1584,
    pageImageUrl: "/static/10k-acme-2025-p88.png",
    query: "Acme 在 2025 财年的自由现金流是多少？",
    answer:
      "此演示夹具中，2025 财年自由现金流为 31.2 亿美元，高于 2024 财年的 24.1 亿美元（表四，第 88 页）。",
    evidence: [
      {
        page: 88,
        bbox: { x: 142, y: 612, w: 410, h: 36 },
        // 证据摘录：自由现金流为 3,118 与 2,406，单位见表头（百万美元）；保持原文列对齐。
        text: "Free cash flow                    3,118    2,406",
        score: 0.91,
      },
      {
        page: 88,
        bbox: { x: 142, y: 250, w: 980, h: 24 },
        // 证据摘录：表四，现金流摘要（单位：百万美元）。
        text: "Table 4. Cash Flow Summary (USD millions)",
        score: 0.74,
      },
    ],
  },
  "nature-paper-2026": {
    id: "nature-paper-2026",
    // 虚构标题：Nature，后期交互检索，2026。不能据此认定确有该论文。
    title: "Nature, late-interaction retrieval, 2026",
    pageWidth: 1200,
    pageHeight: 1553,
    pageImageUrl: "/static/nature-2026-p4.png",
    query: "此演示中的 MaxSim 相比 BM25 改善了多少延迟？",
    answer:
      "此虚构夹具声称，相比 BM25 重排，MaxSim 将 ColBERT 风格查询的延迟降至约 1/4.1（图三，第 4 页）；这不是实测结论。",
    evidence: [
      {
        page: 4,
        bbox: { x: 80, y: 940, w: 520, h: 200 },
        // 证据摘录：图三，端到端检索延迟。
        text: "Fig. 3. End-to-end retrieval latency.",
        score: 0.88,
      },
    ],
  },
};

export function listFixtures(): DocumentFixture[] {
  return Object.values(FIXTURES);
}

export function getFixture(id: string): DocumentFixture | undefined {
  return FIXTURES[id];
}
