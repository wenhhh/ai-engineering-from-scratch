// 阶段接口：限制相对资源路径并检查规范化后的根目录边界，不消除并发替换竞态。 保留未实现占位与诊断，完成实现后再评分。
use super::*;
pub fn reference_path(root: &std::path::Path, resource: &str) -> Result<std::path::PathBuf, Error> {
    todo!("Stage 3: implement reference_path");
}
