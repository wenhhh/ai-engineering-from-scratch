# 编排契约：运行时迁移决策（Orchestration Contract: Runtime Migration Decision）

## 目标与范围（Goal and Scope） <!-- ## Goal and Scope -->

比较三种迁移方案并交付决策简报。研究为只读操作。任何智能体都不得编辑仓库、联系供应商或选定最终架构。

## 任务与依赖（Tasks and Dependencies） <!-- ## Tasks and Dependencies -->

协调器分配来源、运行时和风险研究，并为它们指定互不重叠的主张 ID。所有研究者的允许工具（allowed tools）均为只读。综合阶段等待每项必需结果达到完成（complete）或明确部分完成（partial）；独立审查等待综合结果通过校验。

## 结果状态（Result States） <!-- ## Result States -->

完成（complete）表示满足每个主张字段。部分完成（partial）保留有效主张并列出缺失来源。阻塞（blocked）指出所需的策略、权限或外部状态。

## 预算（Budgets） <!-- ## Budgets -->

每名研究者的预算（budget）为五个来源、六次工具调用和 12 分钟。协调器只能对明确命名的缺口重新委托一次。

## 合并规则（Merge Rules） <!-- ## Merge Rules -->

主张按主张 ID 与来源（provenance）合并。重复来源去重；冲突（conflict）保持可见，同时保留双方来源版本和升级处理负责人。

## 独立审查（Independent Review） <!-- ## Independent Review -->

审查者在隔离（isolated）上下文中接收简报、主张、证据和评分标准，返回稳定问题 ID，且不能编辑候选简报。
