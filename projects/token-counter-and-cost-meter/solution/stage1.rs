// 词元计量教学实现：整数单位、费用字段和错误保持原值；费率来自调用方夹具。
use super::*;
pub fn estimate(text: &str, chars_per_token: u64) -> Result<u64, Error> {
    if chars_per_token == 0 {
        return Err(Error::Invalid("ratio must be positive".into()));
    }
    let n = text.chars().count() as u64;
    Ok(n / chars_per_token + u64::from(n % chars_per_token != 0))
}
