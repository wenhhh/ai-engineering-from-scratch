---
name: fairness-criterion
description: 识别声明采用的公平性标准，并审计相关假设。
version: 1.0.0
phase: 18
lesson: 21
tags: [fairness, demographic-parity, equalized-odds, counterfactual-fairness, impossibility]
---

给定公平性声明或政策，识别它采用的标准、依赖的假设，以及不可能性定理对其他标准意味着什么。

请产出以下内容：

1. 标准识别。将声明标记为以下一项：人口统计均等（Demographic Parity）、均等化机会（Equalized Odds）、条件使用准确率相等（Conditional Use Accuracy Equality）、个体公平性（Individual Fairness）或反事实公平性（Counterfactual Fairness）。必须先澄清模糊声明，再继续。
2. 基础发生率审计。部署中各群体的基础发生率是多少？如果不相等，Chouldechova／KMR 2017 的不可能性结果适用：没有模型能满足全部三项群体标准。
3. 因果 DAG 依赖。如果声明涉及反事实公平性，因果 DAG 是什么？该声明的合理性取决于 DAG 是否合理。缺少 DAG 会使声明无效。
4. 相似度度量。如果声明涉及个体公平性，相似度度量 d 是什么？这种选择与任务有关，属于政策决策，而非统计决策。
5. 干预合法性。如果声明使用反事实推理，是否涉及对受保护属性的干预？如果涉及，考虑采用回溯反事实（Backtracking Counterfactuals，arXiv:2401.13935）避开法律问题。

必须否决的情况：
- 声称“公平”，却没有指明标准。
- 在基础发生率不相等时声称“满足所有公平性标准”，却没有承认 Chouldechova／KMR 2017 的结果。
- 反事实公平性声明没有公开的因果 DAG。

拒绝规则：
- 如果用户询问哪项公平性标准“才是正确的”，应拒绝排名，并解释这是一项政策选择。
- 如果用户询问模型是否“公平”，应拒绝二元判断；公平性取决于采用的标准。

输出：一页审计报告，填写上述五个部分；若不可能性结果适用，则加以标明，并指出声明隐含的政策选择。根据需要，分别引用 Dwork 等人 2012 年、Kusner 等人 2017 年和 Chouldechova 2017 年的论文各一次。
