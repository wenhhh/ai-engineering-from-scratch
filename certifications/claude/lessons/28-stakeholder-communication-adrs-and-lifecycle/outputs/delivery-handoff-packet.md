# 交付交接包：企业研究助手（Delivery Handoff Packet: Enterprise Research Assistant）

## 管理层决策（Executive Decision） <!-- ## Executive Decision -->

批准六周只读试点，将分析周期从两天缩至六小时，同时保持完整来源支持。业务负责人（owner）：研究运营。剩余保密风险需要安全团队接受。

## 架构决策记录（ADR） <!-- ## ADR -->

选择确定性的检索、排序、起草、验证和人工批准工作流。否决（rejected）自适应智能体，因为路径稳定，工具权限没有增加可测量价值。否决单次调用起草，因为来源失败无法定位。

## 契约索引（Contract Index） <!-- ## Contract Index -->

检索、主张、身份、结构化错误、评估和追踪契约分别明确版本规则、失败行为、负责人和确定性测试。

## 运维就绪（Operational Readiness） <!-- ## Operational Readiness -->

时效、P95 延迟、任务质量和成本 SLO 仪表盘已运行。每个告警（alert）都有负责人和操作手册。支持平台负责人完成过时政策事故桌面推演（tabletop），停用路由，并证明可回滚（rollback）到索引 `v17`。

## 归属地图（Ownership Map） <!-- ## Ownership Map -->

研究运营负责结果；知识运营负责来源时效；身份团队负责权限；质量团队负责标签和阈值；SRE 负责运行时；安全团队批准保密控制；产品团队负责用户沟通。

## 逆转条件（Reversal Condition） <!-- ## Reversal Condition -->

以下任一情况触发逆转（reversal）：P95 连续两个窗口超过 20 秒，无依据主张率超过 1%，每份报告评审负载超过八分钟，或超过 20% 的任务需要未建模发现。
