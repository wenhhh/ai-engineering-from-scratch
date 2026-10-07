// 按 Unicode 标量值计算字符预算，完整返回上下文或拒绝加载。
use super::*;
pub fn disclose(skill: &Skill, activate: bool, budget: usize) -> Result<String, Error> {
    let mut text = format!("{}: {}", skill.name, skill.description);
    if activate && !skill.body.is_empty() {
        text.push_str("\n\n");
        text.push_str(&skill.body);
    }
    if text.chars().count() > budget {
        return Err(Error::Limit);
    }
    Ok(text)
}
