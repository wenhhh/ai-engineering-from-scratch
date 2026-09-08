// 课程：开发环境（Dev Environment），阶段 00 / 第 01 课。
// 主题：验证 Rust 二进制程序能否访问四层工具链（Toolchain）：系统、包管理器、运行时和库。
// 使用 `--version` 启动每个工具，捕获标准输出（stdout），
// 报告 PASS/FAIL 及解析后的版本字符串。仅使用标准库（Standard library）。
// 参考资料：
//   https://doc.rust-lang.org/std/process/struct.Command.html
//   https://doc.rust-lang.org/std/process/struct.Output.html
//   https://doc.rust-lang.org/book/ch12-00-an-io-project.html
// 构建：rustc --edition 2021 code/main.rs -o /tmp/lesson_dev_env && /tmp/lesson_dev_env

use std::process::{Command, ExitCode};

struct Check {
    name: &'static str,
    program: &'static str,
    args: &'static [&'static str],
    optional: bool,
}

const CHECKS: &[Check] = &[
    Check { name: "Git",         program: "git",    args: &["--version"], optional: false },
    Check { name: "Python 3.10+", program: "python3", args: &["--version"], optional: false },
    Check { name: "Node.js",     program: "node",   args: &["--version"], optional: false },
    Check { name: "Rust (rustc)", program: "rustc",  args: &["--version"], optional: false },
    Check { name: "Cargo",       program: "cargo",  args: &["--version"], optional: false },
    Check { name: "uv (Python)", program: "uv",     args: &["--version"], optional: true },
    Check { name: "pnpm",        program: "pnpm",   args: &["--version"], optional: true },
    Check { name: "Julia",       program: "julia",  args: &["--version"], optional: true },
];

fn run_check(check: &Check) -> Result<String, String> {
    let output = Command::new(check.program)
        .args(check.args)
        .output()
        .map_err(|e| format!("{}: {}", check.program, e))?;

    if !output.status.success() {
        return Err(format!("退出码（Exit code）{:?}", output.status.code()));
    }

    let combined = if !output.stdout.is_empty() {
        &output.stdout
    } else {
        &output.stderr
    };

    let raw = String::from_utf8_lossy(combined);
    let line = raw.lines().next().unwrap_or("").trim().to_string();
    if line.is_empty() {
        Err("版本输出为空".to_string())
    } else {
        Ok(line)
    }
}

fn parse_minor_python(version_line: &str) -> Option<(u32, u32)> {
    let trimmed = version_line.trim_start_matches("Python").trim();
    let mut parts = trimmed.split('.');
    let major: u32 = parts.next()?.parse().ok()?;
    let minor: u32 = parts.next()?.parse().ok()?;
    Some((major, minor))
}

fn print_header() {
    println!();
    println!("=== 从零开始的 AI 工程（AI Engineering from Scratch）：环境检查（Rust）===");
    println!();
    println!("第 1 层：系统（System）-> 第 2 层：包管理器（Package managers）-> 第 3 层：运行时（Runtimes）-> 第 4 层：库（Libraries）");
    println!();
}

fn main() -> ExitCode {
    print_header();

    let mut required_pass = 0u32;
    let mut required_total = 0u32;
    let mut optional_pass = 0u32;
    let mut optional_total = 0u32;

    let mut python_ok = true;

    println!("必需工具：");
    for check in CHECKS.iter().filter(|c| !c.optional) {
        required_total += 1;
        match run_check(check) {
            Ok(version) => {
                if check.name.starts_with("Python") {
                    match parse_minor_python(&version) {
                        Some((major, minor)) if (major, minor) >= (3, 10) => {}
                        _ => {
                            println!("  [FAIL] {:<14} {}（需要可解析的 Python 3.10+ 版本）", check.name, version);
                            python_ok = false;
                            continue;
                        }
                    }
                }
                required_pass += 1;
                println!("  [PASS] {:<14} {}", check.name, version);
            }
            Err(why) => {
                println!("  [FAIL] {:<14} {}", check.name, why);
                if check.name.starts_with("Python") {
                    python_ok = false;
                }
            }
        }
    }

    println!();
    println!("可选工具：");
    for check in CHECKS.iter().filter(|c| c.optional) {
        optional_total += 1;
        match run_check(check) {
            Ok(version) => {
                optional_pass += 1;
                println!("  [PASS] {:<14} {}", check.name, version);
            }
            Err(_) => {
                println!("  [skip] {:<14} 未安装", check.name);
            }
        }
    }

    println!();
    println!("汇总：必需工具 {}/{}，可选工具 {}/{}",
             required_pass, required_total, optional_pass, optional_total);

    if required_pass == required_total && python_ok {
        println!();
        println!("环境已就绪。请从阶段 1 开始。");
        ExitCode::SUCCESS
    } else {
        println!();
        println!("请修复上述失败项，然后重新运行本检查。");
        ExitCode::from(1)
    }
}
