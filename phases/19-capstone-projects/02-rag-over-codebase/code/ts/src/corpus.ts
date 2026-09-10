/**
 * 代码库 RAG 的六条示例分块。
 * body 与 summary 都参与分词、向量计算和 BM25 打分，不能只翻译摘要而声称检索行为不变。
 * 下面用中文旁注解释固定英文语料；仓库名、路径、符号和代码片段保持原样。
 */

import type { Chunk } from "./types.ts";

export const SAMPLE_CORPUS: Chunk[] = [
  {
    repo: "uploader",
    path: "services/retry.go",
    startLine: 122,
    endLine: 148,
    symbol: "AbortMultipartOnFail",
    body: "if ctx.Err() != nil { return abort() }; decrement bucket budget; retry with backoff",
    summary:
      // 终止正在进行的 S3 分段上传，并扣减该存储桶的重试预算；摘要参与检索，保留英文。
      "aborts an in-flight S3 multipart upload and decrements the per-bucket retry budget",
  },
  {
    repo: "uploader",
    path: "config/budgets.yaml",
    startLine: 34,
    endLine: 51,
    symbol: "bucket_budget",
    body: "per_bucket_budget: 64; backoff_ms: [100, 500, 2500]; abort_threshold: 3",
    summary:
      // 声明各 S3 存储桶的重试预算与指数退避安排；保留作为检索语料。
      "declares the retry budget and exponential backoff schedule per S3 bucket",
  },
  {
    repo: "client",
    path: "libs/s3client/multipart.ts",
    startLine: 44,
    endLine: 61,
    symbol: "abortUpload",
    body: "await s3.abortMultipartUpload({Bucket, Key, UploadId}); metrics.inc('s3.abort')",
    // 客户端取消 S3 分段上传，并记录指标。
    summary: "client-side S3 multipart abort with metrics instrumentation",
  },
  {
    repo: "auth",
    path: "services/authz/check.py",
    startLine: 12,
    endLine: 38,
    symbol: "check_permission",
    body: "def check_permission(user, resource, action): return policy.evaluate(user, resource, action)",
    summary:
      // 集中授权入口：根据用户、资源与操作评估 OPA 策略。
      "central authorization gateway evaluating an OPA policy for user-resource-action",
  },
  {
    repo: "auth",
    path: "libs/policy/opa.py",
    startLine: 88,
    endLine: 110,
    symbol: "evaluate",
    body: "def evaluate(user, resource, action): return self.engine.query('authz', input=...)",
    // 封装 OPA 策略引擎查询，用于授权检查。
    summary: "OPA policy engine query wrapper for authorization checks",
  },
  {
    repo: "catalog",
    path: "services/search/query.rs",
    startLine: 200,
    endLine: 240,
    symbol: "rank_fusion",
    body: "pub fn rank_fusion(dense: Vec<Hit>, sparse: Vec<Hit>) -> Vec<Hit>",
    // 用倒数排名融合合并稠密与稀疏检索结果。
    summary: "reciprocal rank fusion of dense and sparse retrieval results",
  },
];
