# 可靠性包：仓库安全评审（Reliability Packet: Repository Security Review）

## 范围与覆盖率（Scope and Coverage） <!-- ## Scope and Coverage -->

清单要求检查 24 个文件。首轮评审 24 个中的 18 个（18 of 24）；六个省略的（omitted）文件仍明确列在 `services/payments/**` 下。保留两项有效发现。

## 来源封装（Provenance Envelope） <!-- ## Provenance Envelope -->

证据 `policy-auth-017` 携带仓库 URI、来源版本（source version）`3a91c7e`、生效日期、权威性、Markdown 内容类型（content type）、标题与行位置（location）、提取器版本以及观察时间。

## 部分结果（Partial Result） <!-- ## Partial Result -->

状态为 partial，而不是 complete。可重试的依赖超时明确指出六个未评审文件、追踪 `8801`、两个发现 ID 和完整交付物引用。

## 冲突（Conflict） <!-- ## Conflict -->

两份已批准政策对词元轮换存在分歧。两个版本及确切片段都保持可见，不编造优先级规则。

## 升级处理（Escalation） <!-- ## Escalation -->

负责人（owner）是安全架构团队。安全下一步（safe next action）是停止上线，解决优先级问题，然后只评审明确列出的覆盖缺口。

## 人工评审（Human Review） <!-- ## Human Review -->

评审每项严重发现、部分结果和政策冲突，并对普通通过项随机抽样（random sample）。记录处置意见与修正原因。
