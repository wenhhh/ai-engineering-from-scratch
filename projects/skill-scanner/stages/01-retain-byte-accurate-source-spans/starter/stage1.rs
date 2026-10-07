// 阶段接口：保留原始 UTF-8 字节区间，逐行拆分并处理行结束符。 保留未实现占位与诊断，完成实现后再评分。
use super::*;
pub fn spans(text: &str, max_bytes: usize) -> Result<Vec<Span>, Error> {
    todo!("Stage 1: implement spans");
}
