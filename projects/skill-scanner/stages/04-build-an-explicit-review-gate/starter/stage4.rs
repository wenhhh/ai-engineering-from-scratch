// 阶段接口：校验来源切片、数量与阈值，输出人工审阅提示，不执行技能内容。 保留未实现占位与诊断，完成实现后再评分。
use super::*;
pub fn review(
    text: &str,
    findings: &[Finding],
    threshold: u32,
    max_findings: usize,
) -> Result<String, Error> {
    todo!("Stage 4: implement review");
}
