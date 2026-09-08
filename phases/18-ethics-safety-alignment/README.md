# 第 18 阶段：伦理、安全与对齐（Ethics, Safety & Alignment）

> 构建有益于人类的 AI。这不是可选要求。

## 在 GitHub 上开始本阶段（Start This Phase on GitHub）

**Prerequisites:** 阶段 10 的第 06、07、08 课，分别介绍监督微调（SFT）、人类反馈强化学习（RLHF）和直接偏好优化（DPO）。

**第一课（First Lesson）：** [将指令遵循作为对齐信号（Instruction-Following as Alignment Signal）](01-instruction-following-alignment-signal/)

在仓库根目录运行以下命令：

```bash
python3 phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/code/main.py
```

保留运行命令、退出码、采用与未采用 KL 惩罚时的策略、奖励和 KL 轨迹，
并用一句话指出你观察到的代理指标失效（Proxy Failure）。

**下一步（Next Action）：** 修改 KL 系数，预测策略漂移，然后继续学习
[奖励投机与古德哈特定律（Reward Hacking and Goodhart's Law）](02-reward-hacking-goodhart/)。

浏览[第 18 阶段完整课程列表](../../README.md#phase-18)，或查看
[跨阶段路线图](../../ROADMAP.md)。
