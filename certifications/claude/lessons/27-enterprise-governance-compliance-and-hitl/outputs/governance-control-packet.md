# 治理控制包：患者消息分流（Governance Control Packet: Patient Message Routing）

## 风险登记表（Risk Register） <!-- ## Risk Register -->

紧急消息假阴性可能延误治疗；提示词注入可能改变分流；过时临床指导可能误导评审；评审者过载可能让审批流于形式。每项风险都有领域负责人（owner）和剩余风险决策。

## 数据地图（Data Map） <!-- ## Data Map -->

只有消息文本、案例 ID、语言和最少分流上下文跨越应用边界。患者身份留在临床权威记录系统。分别明确载荷、追踪、评估、评审、保留、删除和地区边界。

## 控制矩阵（Control Matrix） <!-- ## Control Matrix -->

预防性（preventive）：检索前的租户与角色门禁。检测性（detective）：紧急案例假阴性监控。纠正性（corrective）：停用自动分流，恢复人工分诊。治理性（governance）：实质变化后由隐私和临床负责人重新批准。

## 人工评审（Human Review） <!-- ## Human Review -->

每个紧急、冲突、证据薄弱或新语言案例都接受合格（qualified）临床评审。证据包包含来源、拟议类别、标记和轨迹。队列 SLO（queue SLO）为五分钟，配有足够人员，批准、编辑、拒绝和升级结果均附原因码。

## 后备方案（Fallback） <!-- ## Fallback -->

若评审未达队列 SLO，或来源时效检查失败，后备方案将案例送到既有人工紧急分诊队列（manual urgent-triage queue），并阻止任何自动记录修改。

## 重新评估（Reassessment） <!-- ## Reassessment -->

用途、人群、模型、数据、权限、地区、政策、规模或已观察伤害的实质变化（material change）会触发新评审。本包不代表获授权负责人宣称法律或临床合规。
