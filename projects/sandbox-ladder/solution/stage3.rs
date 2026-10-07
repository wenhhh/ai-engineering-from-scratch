// 先满足能力与预算，再按成本和名称选择；不能自动降低需求。
use super::*;
pub fn select(n: &Needs, candidates: &[Profile], budget: u32) -> Result<Profile, Error> {
    candidates
        .iter()
        .filter(|p| p.cost <= budget && satisfies(n, p))
        .min_by(|a, b| a.cost.cmp(&b.cost).then(a.name.cmp(&b.name)))
        .cloned()
        .ok_or(Error::Limit)
}
