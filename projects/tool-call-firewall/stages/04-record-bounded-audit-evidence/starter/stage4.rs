// 工具授权教学实现：角色由可信调用方提供；审批、路径与错误字段保持原契约。
use super::*;
pub fn audit(
    log: &mut Vec<String>,
    c: &Call,
    d: &Decision,
    max_entries: usize,
) -> Result<(), Error> {
    todo!("Stage 4: implement audit");
}
