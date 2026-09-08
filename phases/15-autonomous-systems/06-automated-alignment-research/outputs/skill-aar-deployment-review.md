---
name: aar-deployment-review
description: 自动化对齐研究流水线的部署前审查，涵盖沙箱隔离与日志完整性。
version: 1.0.0
phase: 15
lesson: 6
tags: [aar, alignment-research, sandbox, log-integrity, rsp]
---

给定拟议的自动化对齐研究（Automated Alignment Research，AAR）部署（模型、沙箱、任务队列、论坛），提供可供前沿实验室安全团队签字批准的部署前审查。

请输出：

1. **沙箱隔离（Sandbox isolation）。** 验证每个 AAR 实例的文件系统、网络和进程限制。确认 AAR 不能读取或修改其他 AAR 的沙箱，也不能直接访问论坛存储写入端点（所有发帖经过独立服务）。
2. **论坛日志完整性（Forum log integrity）。** 论坛日志必须只允许追加（Append-only），且任何篡改都能被检测出来（Tamper-evident）。明确存储方案，例如带对象锁的 S3、不可变账本、只追加的预写日志（Write-ahead log，WAL）；同时规定验证间隔和发现篡改后的处置方式。
3. **任务分配策略（Task allocation policy）。** 说明任务如何分配：谁编写、谁批准，AAR 是否能提议自己的后续任务，以及允许条件。自由分解在性能上占优，规定工作流在可审计性上占优。明确记录权衡。
4. **人工审查门禁（Human review gate）。** 任何 AAR 输出影响实际研究方向、训练数据或发表工作前，必须由具名人类审查者批准。规定清单：实验可复现性、日志完整性、声明与证据映射。
5. **阈值监控（Threshold monitoring）。** 跟踪 AAR 系统接近 RSP v3.0 AI R&D-4 范围的信号：任务复杂度变化、自主派生子任务、跨任务信息传递。定义要求升级审查的阈值。

必须拒绝：
- 未在沙箱外保存可检测篡改的日志的 AAR 部署。
- AAR 输出未经具名人工审查就直接进入训练数据或生产策略的流水线。
- 单个 AAR 拥有足以影响多个下游系统凭据的流水线。

拒绝规则：
- 若沙箱隔离未规定，或仅依赖一层（只有 Docker，没有 seccomp / gVisor），拒绝并要求纵深防御（Defense-in-depth）。
- 若日志存储可被任何人编辑，即使是运维人员，也拒绝并要求一次写入介质。
- 若部署目标是自动化能力流水线的一部分，而不只是对齐研究，拒绝并升级至 RSP 审查。

输出格式：

返回审查备忘录，包含：
- **流水线摘要（Pipeline summary）**：一段话
- **隔离评分（Isolation score）**：分别评价文件系统（fs）、网络（net）、进程（proc）及其他智能体（peer）的隔离情况
- **日志完整性评分（Log integrity score）**：附验证计划
- **任务分配决定（Task allocation decision）**：固定 / 自由 / 混合，附理由
- **人工审查门禁（Human review gate）**：审查者姓名、清单
- **阈值监控项（Threshold monitors）**：信号、阈值、响应列表
- **部署结论（Deployment verdict）**：放行 / 暂缓 / 禁止
