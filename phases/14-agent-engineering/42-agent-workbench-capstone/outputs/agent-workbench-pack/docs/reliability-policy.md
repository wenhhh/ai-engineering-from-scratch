# 可靠性政策（Reliability Policy）

工作台应对行业中反复出现的五种失败模式：

1. 行动幻觉（Hallucinated Action）：由规则集与验证关卡捕获。
2. 范围蔓延（Scope Creep）：由范围契约差异检查捕获。
3. 级联错误（Cascading Errors）：由反馈记录与空退出状态即拒绝机制捕获。
4. 上下文丢失（Context Loss）：依靠仓库记忆缓解；聊天不是事实来源。
5. 工具误用（Tool Misuse）：由审查评分标准中的验证维度捕获。

政策由验证关卡执行。例外放行路径需要签署
并接受审计；智能体不能自行放行。
