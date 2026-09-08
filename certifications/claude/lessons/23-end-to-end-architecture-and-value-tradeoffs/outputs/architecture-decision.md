# ADR：合同评审模式（Contract Review Pattern）

## 决策（Decision） <!-- ## Decision -->

选择确定性工作流（workflow）：接收、分段、版本化检索、分析、独立证据评审、修订稿生成和法律顾问审批。负责人（owner）：法律技术架构团队。

## 候选评分（Candidate Scores） <!-- ## Candidate Scores -->

增强调用最快，但无法隔离失败。工作流在安全（safety）、可审计性和可预测延迟（latency）上领先。自适应智能体（agent）只在未建模分支上领先。多智能体评审增加独立性，但不增加写权限。

## 硬性门禁（Hard Gates） <!-- ## Hard Gates -->

授权、租户隔离、来源追踪和安全不能与便利性进行平均权衡。任何无依据的实质结论都会阻止候选方案通过。

## 失败路径（Failure Paths） <!-- ## Failure Paths -->

检索超时返回部分证据，不生成修订稿。政策冲突交给法律顾问。无效模式获得一次针对性修复。工具中断时使用人工评审队列。回滚（rollback）恢复先前索引和工作流版本。

## 被否决方案（Rejected Alternatives） <!-- ## Rejected Alternatives -->

否决单个庞大增强调用，因为职责与证据被混在一起。否决自适应执行智能体，因为流程已知，且操作需要人类授权。

## 逆转条件（Reversal Condition） <!-- ## Reversal Condition -->

若超过 20% 的已接受案例需要安全但未建模的证据发现，并且经过评估的智能体能在不突破成本、延迟或硬门禁的前提下提高成功率，则重新考虑工作流。架构负责人批准逆转（reversal）。
