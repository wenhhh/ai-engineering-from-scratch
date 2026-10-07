// 按规则与行号去重，检查严重程度范围并对累加值检测溢出。
use super::*;
pub fn risk_score(findings: &[Finding]) -> Result<u32, Error> {
    let mut seen = std::collections::BTreeSet::new();
    let mut score = 0u32;
    for f in findings {
        if f.line == 0 || f.start > f.end || !(1..=3).contains(&f.severity) {
            return Err(Error::Invalid("invalid finding".into()));
        }
        if seen.insert((f.rule.clone(), f.line)) {
            score = score.checked_add(f.severity).ok_or(Error::Limit)?;
        }
    }
    Ok(score)
}
