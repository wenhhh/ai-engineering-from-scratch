// 课程: 量化（Quantization）— INT8 / GPTQ / AWQ / GGUF（阶段 10 / 第 11 课）
// 主题: 对 FP32 权重向量进行对称 INT8 量化（Symmetric quantization）。根据绝对最大值
// 计算缩放因子（Scale），舍入并截断至 [-127, 127]，然后反量化（Dequantize），报告均方误差（MSE）、
// 最大绝对误差、信噪比（SNR）、余弦相似度，并执行位宽扫描（8 / 4 / 2 位）。
// 参考资料:
//   https://pytorch.org/docs/stable/quantization.html
//   https://leimao.github.io/article/Neural-Networks-Quantization/
//   https://arxiv.org/abs/2210.17323  (GPTQ)
//   https://arxiv.org/abs/2306.00978  (AWQ)
// 构建: rustc --edition 2021 -O code/main.rs -o /tmp/lesson_quant && /tmp/lesson_quant

use std::f64;

fn lcg(seed: &mut u64) -> f64 {
    *seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    let bits = (*seed >> 11) as u64;
    let unit = bits as f64 / (1u64 << 53) as f64;
    unit * 2.0 - 1.0
}

// 通过线性同余生成器（LCG）实现 Box-Muller 变换，无需外部 crate 即可生成近似正态分布浮点数。
fn randn(seed: &mut u64) -> f64 {
    let u1 = (lcg(seed) + 1.0) / 2.0;
    let u2 = (lcg(seed) + 1.0) / 2.0;
    let u1 = u1.max(1e-12);
    let r = (-2.0 * u1.ln()).sqrt();
    r * (2.0 * std::f64::consts::PI * u2).cos()
}

struct QuantResult {
    qmin: i32,
    qmax: i32,
    scale: f64,
    quantized: Vec<i32>,
    reconstructed: Vec<f64>,
}

fn quantize_symmetric(weights: &[f64], num_bits: u32) -> QuantResult {
    let qmax = (1i32 << (num_bits - 1)) - 1;
    let qmin = -qmax;

    let abs_max = weights.iter().fold(0.0f64, |acc, &x| acc.max(x.abs()));
    let scale = if abs_max == 0.0 { 1.0 } else { abs_max / qmax as f64 };

    let mut quantized = Vec::with_capacity(weights.len());
    let mut reconstructed = Vec::with_capacity(weights.len());
    for &w in weights {
        let q = (w / scale).round() as i32;
        let q = q.max(qmin).min(qmax);
        quantized.push(q);
        reconstructed.push(q as f64 * scale);
    }

    QuantResult { qmin, qmax, scale, quantized, reconstructed }
}

struct ErrorReport {
    mse: f64,
    rmse: f64,
    max_abs_error: f64,
    snr_db: f64,
    cosine: f64,
}

fn error_report(original: &[f64], reconstructed: &[f64]) -> ErrorReport {
    let n = original.len() as f64;
    let mut sum_sq_err = 0.0f64;
    let mut max_abs = 0.0f64;
    let mut signal_power = 0.0f64;
    let mut dot = 0.0f64;
    let mut norm_a = 0.0f64;
    let mut norm_b = 0.0f64;

    for (a, b) in original.iter().zip(reconstructed.iter()) {
        let diff = a - b;
        sum_sq_err += diff * diff;
        max_abs = max_abs.max(diff.abs());
        signal_power += a * a;
        dot += a * b;
        norm_a += a * a;
        norm_b += b * b;
    }

    let mse = sum_sq_err / n;
    let rmse = mse.sqrt();
    let snr_db = if mse > 0.0 {
        10.0 * (signal_power / n / mse).log10()
    } else {
        f64::INFINITY
    };
    let cosine = if norm_a > 0.0 && norm_b > 0.0 {
        dot / (norm_a.sqrt() * norm_b.sqrt())
    } else {
        0.0
    };

    ErrorReport { mse, rmse, max_abs_error: max_abs, snr_db, cosine }
}

fn print_quant_summary(label: &str, weights: &[f64], r: &QuantResult, err: &ErrorReport) {
    println!("[{}]", label);
    println!("  范围（Range）[qmin, qmax]    {} .. {}", r.qmin, r.qmax);
    println!("  缩放因子（Scale，FP32 步长）     {:.8}", r.scale);
    println!("  样本权重（10 个）   {:?}", &weights[..10.min(weights.len())]
        .iter().map(|w| format!("{:+.4}", w)).collect::<Vec<_>>());
    println!("  量化编码（10 个）  {:?}", &r.quantized[..10.min(r.quantized.len())]);
    println!("  反量化结果（10 个）      {:?}", &r.reconstructed[..10.min(r.reconstructed.len())]
        .iter().map(|w| format!("{:+.4}", w)).collect::<Vec<_>>());
    println!();
    println!("  均方误差（mse）                   {:.10}", err.mse);
    println!("  均方根误差（rmse）                  {:.10}", err.rmse);
    println!("  最大绝对误差 max |error|           {:.10}", err.max_abs_error);
    println!("  信噪比（snr）                   {:.2} dB", err.snr_db);
    println!("  余弦相似度（Cosine similarity）     {:.10}", err.cosine);
    println!();
}

fn fmt_bytes(b: u64) -> String {
    let kb = b as f64 / 1024.0;
    if kb < 1024.0 { format!("{:.2} KB", kb) } else { format!("{:.2} MB", kb / 1024.0) }
}

fn main() {
    let mut seed: u64 = 42;

    let n = 8192;
    let mut weights: Vec<f64> = (0..n).map(|_| randn(&mut seed) * 0.02).collect();

    weights[0] *= 25.0;
    weights[123] *= 15.0;
    weights[2048] *= 10.0;

    let stats = {
        let abs_vals: Vec<f64> = weights.iter().map(|x| x.abs()).collect();
        let max = abs_vals.iter().fold(0.0f64, |a, &b| a.max(b));
        let mean: f64 = abs_vals.iter().sum::<f64>() / abs_vals.len() as f64;
        let var: f64 = abs_vals.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / abs_vals.len() as f64;
        (max, mean, var.sqrt())
    };

    println!();
    println!("=== INT8 量化（Rust，仅标准库） ===");
    println!();
    println!("张量（Tensor）       : 1D 权重向量，n = {}", n);
    println!("分布（Distribution） : Normal(0, 0.02)，包含 3 个离群权重");
    println!("  最大值 max |w|      {:.6}", stats.0);
    println!("  均值 mean |w|     {:.6}", stats.1);
    println!("  标准差 std |w|      {:.6}", stats.2);
    println!();

    let r8 = quantize_symmetric(&weights, 8);
    let err8 = error_report(&weights, &r8.reconstructed);
    print_quant_summary("INT8 逐张量对称量化（Symmetric per-tensor）", &weights, &r8, &err8);

    println!("--- 位宽扫描（Bit-width sweep，逐张量对称量化） ---");
    println!("  {:>5}  {:>10}  {:>14}  {:>10}  {:>12}  {:>10}",
             "位数（bits）", "量化级数（levels）", "均方误差（mse）", "信噪比（snr_db）", "最大绝对误差 max |err|", "相对 FP32 倍数（ratio_vs_fp32）");
    for bits in [16u32, 8, 4, 2] {
        let r = quantize_symmetric(&weights, bits);
        let er = error_report(&weights, &r.reconstructed);
        let ratio = 32.0 / bits as f64;
        let levels = (r.qmax - r.qmin + 1) as u64;
        println!("  {:>5}  {:>10}  {:>14.10}  {:>10.2}  {:>12.6}  {:>9.1}x",
                 bits, levels, er.mse, er.snr_db, er.max_abs_error, ratio);
    }
    println!();

    let fp32_bytes = (n * 4) as u64;
    let int8_bytes = (n * 1) as u64 + 8;
    let int4_bytes = ((n + 1) / 2) as u64 + 8;
    println!("--- 内存占用（Memory footprint） ---");
    println!("  FP32 权重     {}", fmt_bytes(fp32_bytes));
    println!("  INT8 + 缩放因子（scale）     {}   （缩小 {:.1}x）", fmt_bytes(int8_bytes), fp32_bytes as f64 / int8_bytes as f64);
    println!("  INT4 + 缩放因子（scale）     {}   （缩小 {:.1}x）", fmt_bytes(int4_bytes), fp32_bytes as f64 / int4_bytes as f64);
    println!();

    println!("要点:");
    println!("  - 对于正态权重分布，INT8 可使信噪比（SNR）保持在远高于 30 dB 的水平。");
    println!("  - 离群值主导缩放因子: {} 个权重中的 3 个离群值会增大缩放因子，", n);
    println!("    浪费其余权重的精度。逐通道量化（Per-channel）或 GPTQ/AWQ 有助于缓解此问题。");
    println!();
}
