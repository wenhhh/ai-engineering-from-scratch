// 阶段接口：解析明确限定的元数据头与双引号转义，拒绝不支持的 YAML 语法。 保留未实现占位与诊断，完成实现后再评分。
use super::*;
pub fn parse(text: &str) -> Result<std::collections::BTreeMap<String, String>, Error> {
    todo!("Stage 1: implement parse");
}
