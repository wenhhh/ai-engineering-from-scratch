// 记忆服务器的余弦评分内核。
// 向量契约见 ../stages/03-hybrid-search/docs/en.md。
// 进程经 stdin 接收有限数值组成、以逗号分隔的向量。
// 仅用 Rust 标准库，使用 rustc --edition 2021 编译。
use std::io::{self, Read};
fn vector(line: &str) -> Result<Vec<f64>, String> {
    let out: Result<Vec<f64>, _> = line.split(',').map(|v| v.parse::<f64>()).collect();
    let out = out.map_err(|_| "invalid number".to_string())?;
    if out.is_empty() || out.iter().any(|v| !v.is_finite()) { return Err("invalid vector".into()); }
    Ok(out)
}
fn run(input: &str) -> Result<String, String> {
    let mut lines = input.lines();
    let query = vector(lines.next().ok_or("missing query")?)?;
    let mut output = String::new();
    for (index, line) in lines.enumerate() {
        let doc = vector(line)?;
        if doc.len() != query.len() { return Err("dimension mismatch".into()); }
        let dot: f64 = query.iter().zip(&doc).map(|(a,b)| a*b).sum();
        let qn: f64 = query.iter().map(|v| v*v).sum::<f64>().sqrt();
        let dn: f64 = doc.iter().map(|v| v*v).sum::<f64>().sqrt();
        let score = if qn == 0.0 || dn == 0.0 { 0.0 } else { dot / (qn * dn) };
        output.push_str(&format!("{}\t{:.9}\n", index, score));
    }
    Ok(output)
}
fn main() {
    let mut input = String::new(); io::stdin().read_to_string(&mut input).unwrap();
    match run(&input) { Ok(out) => print!("{}", out), Err(error) => {eprintln!("{}",error);std::process::exit(1);} }
}
