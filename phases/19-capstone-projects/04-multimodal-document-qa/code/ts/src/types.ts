/**
 * 文档夹具与引用区域的数据类型。
 * BoundingBox 的 x/y/w/h 为左上角坐标、宽、高；坐标以原始页面尺寸为基准。
 * EvidenceRegion 包含页码、边界框、证据原文和预设得分；字段名保留以兼容 JSON。
 */

export type BoundingBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type EvidenceRegion = {
  page: number;
  bbox: BoundingBox;
  text: string;
  score: number;
};

export type DocumentFixture = {
  id: string;
  title: string;
  pageWidth: number;
  pageHeight: number;
  pageImageUrl: string;
  query: string;
  answer: string;
  evidence: EvidenceRegion[];
};
