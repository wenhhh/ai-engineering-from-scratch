// 阶段接口：校验名称、目录一致性和描述长度，保留原始正文及说明。 保留未实现占位与诊断，完成实现后再评分。
use super::*;
pub fn validate(
    fields: &std::collections::BTreeMap<String, String>,
    directory: &str,
) -> Result<Skill, Error> {
    todo!("Stage 2: implement validate");
}
