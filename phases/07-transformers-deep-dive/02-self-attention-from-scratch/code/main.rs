// 从零实现自注意力内核（Self-attention kernel），仅用标准库。
// 主题：使用显式行优先内存（Row-major memory）的缩放点积注意力（Scaled dot-product attention）。
// 参考资料（借鉴思路，不作为依赖）:
//   - Vaswani 2017, "Attention Is All You Need": https://arxiv.org/abs/1706.03762
//   - candle 参考注意力内核:        https://github.com/huggingface/candle/blob/main/candle-nn/src/ops.rs
//   - Karpathy llm.c 注意力前向传播（Forward pass）:    https://github.com/karpathy/llm.c/blob/master/train_gpt2.c
//
// 编译并运行:  rustc --edition 2021 main.rs -o /tmp/sa && /tmp/sa

use std::f32::consts::E;

// 使用平坦 Vec<f32> 存储的行优先矩阵（Row-major matrix）。辅助方法按 (row, col) 索引。
struct Mat {
    rows: usize,
    cols: usize,
    data: Vec<f32>,
}

impl Mat {
    fn zeros(rows: usize, cols: usize) -> Self {
        Mat { rows, cols, data: vec![0.0; rows * cols] }
    }

    #[inline] fn at(&self, i: usize, j: usize) -> f32 { self.data[i * self.cols + j] }
    #[inline] fn set(&mut self, i: usize, j: usize, v: f32) { self.data[i * self.cols + j] = v; }

    fn matmul(&self, b: &Mat) -> Mat {
        assert_eq!(self.cols, b.rows, "形状不匹配: {}x{} @ {}x{}", self.rows, self.cols, b.rows, b.cols);
        let mut out = Mat::zeros(self.rows, b.cols);
        for i in 0..self.rows {
            for k in 0..self.cols {
                let aik = self.at(i, k);
                if aik == 0.0 { continue; }
                let row_base = i * out.cols;
                let bk_base = k * b.cols;
                for j in 0..b.cols {
                    out.data[row_base + j] += aik * b.data[bk_base + j];
                }
            }
        }
        out
    }

    fn transpose(&self) -> Mat {
        let mut t = Mat::zeros(self.cols, self.rows);
        for i in 0..self.rows {
            for j in 0..self.cols {
                t.set(j, i, self.at(i, j));
            }
        }
        t
    }

    fn scale(&mut self, s: f32) {
        for v in self.data.iter_mut() { *v *= s; }
    }
}

// 沿最后一轴（逐行）计算 Softmax，保持数值稳定。
fn softmax_rows(m: &Mat) -> Mat {
    let mut out = Mat::zeros(m.rows, m.cols);
    for i in 0..m.rows {
        let mut row_max = f32::NEG_INFINITY;
        for j in 0..m.cols { if m.at(i, j) > row_max { row_max = m.at(i, j); } }
        let mut sum = 0.0f32;
        for j in 0..m.cols {
            let e = E.powf(m.at(i, j) - row_max);
            out.set(i, j, e);
            sum += e;
        }
        let inv = 1.0 / sum;
        for j in 0..m.cols {
            let v = out.at(i, j) * inv;
            out.set(i, j, v);
        }
    }
    out
}

// 计算 Q @ K^T / sqrt(d_k)，应用 Softmax，再 @ V。
fn scaled_dot_product_attention(q: &Mat, k: &Mat, v: &Mat) -> (Mat, Mat) {
    let dk = q.cols as f32;
    let k_t = k.transpose();
    let mut scores = q.matmul(&k_t);
    scores.scale(1.0 / dk.sqrt());
    let weights = softmax_rows(&scores);
    let out = weights.matmul(v);
    (out, weights)
}

// 从 Lehmer 线性同余生成器（LCG）经 Box-Muller 生成确定性高斯随机数，无外部依赖。
struct Rng { state: u64 }
impl Rng {
    fn new(seed: u64) -> Self { Rng { state: seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1 } }
    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.state >> 33) as u32
    }
    fn uniform(&mut self) -> f32 {
        (self.next_u32() as f32 + 1.0) / (u32::MAX as f32 + 2.0)
    }
    fn gauss(&mut self) -> f32 {
        let u1 = self.uniform();
        let u2 = self.uniform();
        (-2.0 * u1.ln()).sqrt() * (2.0 * std::f32::consts::PI * u2).cos()
    }
}

fn randn(rows: usize, cols: usize, scale: f32, rng: &mut Rng) -> Mat {
    let mut m = Mat::zeros(rows, cols);
    for v in m.data.iter_mut() { *v = rng.gauss() * scale; }
    m
}

struct SelfAttention {
    wq: Mat,
    wk: Mat,
    wv: Mat,
}

impl SelfAttention {
    fn new(d_model: usize, dk: usize, dv: usize, rng: &mut Rng) -> Self {
        let s_qk = (2.0 / (d_model + dk) as f32).sqrt();
        let s_v = (2.0 / (d_model + dv) as f32).sqrt();
        SelfAttention {
            wq: randn(d_model, dk, s_qk, rng),
            wk: randn(d_model, dk, s_qk, rng),
            wv: randn(d_model, dv, s_v, rng),
        }
    }

    fn forward(&self, x: &Mat) -> (Mat, Mat) {
        let q = x.matmul(&self.wq);
        let k = x.matmul(&self.wk);
        let v = x.matmul(&self.wv);
        scaled_dot_product_attention(&q, &k, &v)
    }
}

fn print_attention(weights: &Mat, tokens: &[&str]) {
    print!("      ");
    for t in tokens { print!("{:>7}", t); }
    println!();
    for i in 0..weights.rows {
        print!("{:>6}", tokens[i]);
        for j in 0..weights.cols { print!("{:>7.3}", weights.at(i, j)); }
        println!();
    }
}

fn ascii_heatmap(weights: &Mat, tokens: &[&str]) {
    let chars = [' ', '\u{2591}', '\u{2592}', '\u{2593}', '\u{2588}'];
    let mut w_max = 0.0f32;
    for v in &weights.data { if *v > w_max { w_max = *v; } }
    print!("      ");
    for t in tokens { print!("{:>7}", t); }
    println!();
    for i in 0..weights.rows {
        print!("{:>6}", tokens[i]);
        for j in 0..weights.cols {
            let level = ((weights.at(i, j) * (chars.len() - 1) as f32) / w_max) as usize;
            let level = level.min(chars.len() - 1);
            print!("     {} ", chars[level]);
        }
        println!();
    }
}

fn softmax_vec(logits: &[f32]) -> Vec<f32> {
    let mut m = f32::NEG_INFINITY;
    for &x in logits { if x > m { m = x; } }
    let exps: Vec<f32> = logits.iter().map(|x| (x - m).exp()).collect();
    let s: f32 = exps.iter().sum();
    exps.into_iter().map(|x| x / s).collect()
}

fn main() {
    let sentence = ["The", "cat", "sat", "on", "the", "mat"];
    let n_tokens = sentence.len();
    let d_model: usize = 16;
    let dk: usize = 8;
    let dv: usize = 8;

    println!("{}", "=".repeat(60));
    println!("从零实现自注意力（Self-attention） （Rust 移植版）");
    println!("{}", "=".repeat(60));

    let mut rng = Rng::new(42);
    let x = randn(n_tokens, d_model, 1.0, &mut rng);
    println!("\n句子（Sentence，英文词元保留）: {}", sentence.join(" "));
    println!("词元数（Tokens）: {}, d_model: {}, dk: {}, dv: {}", n_tokens, d_model, dk, dv);
    println!("输入形状（Input shape）: ({}, {})", x.rows, x.cols);

    let mut rng_w = Rng::new(42);
    let attn = SelfAttention::new(d_model, dk, dv, &mut rng_w);
    let (out, weights) = attn.forward(&x);

    println!("\n输出形状（Output shape）: ({}, {})", out.rows, out.cols);
    println!("\n注意力权重（Attention weights）:");
    print_attention(&weights, &sentence);

    println!("\nASCII 热力图（Heatmap，越深表示注意力越高）:");
    ascii_heatmap(&weights, &sentence);

    println!("\n{}", "=".repeat(60));
    println!("Softmax 演示");
    println!("{}", "=".repeat(60));

    let logits = [2.0f32, 1.0, 0.1];
    let probs = softmax_vec(&logits);
    println!("\n逻辑值（Logits）:  {:?}", logits);
    println!("Softmax: {:?}", probs.iter().map(|p| (p * 10000.0).round() / 10000.0).collect::<Vec<_>>());
    println!("总和（Sum）:     {:.4}", probs.iter().sum::<f32>());

    let large = [100.0f32, 200.0, 300.0];
    let probs_l = softmax_vec(&large);
    println!("\n大数值逻辑值（Large logits）:  {:?}", large);
    println!("Softmax:       {:?}", probs_l.iter().map(|p| (p * 10000.0).round() / 10000.0).collect::<Vec<_>>());
    println!("总和（Sum）:           {:.4}", probs_l.iter().sum::<f32>());
    println!("（数值稳定，无溢出）");

    println!("\n{}", "=".repeat(60));
    println!("微基准测试（Microbenchmark）：10K 次注意力前向传播");
    println!("{}", "=".repeat(60));
    let start = std::time::Instant::now();
    let mut sink = 0.0f32;
    for _ in 0..10_000 {
        let (o, _) = attn.forward(&x);
        sink += o.at(0, 0);
    }
    let elapsed = start.elapsed();
    println!("10K 次前向传播耗时 {:.2}ms（{:.0}/秒）  sink={:.4}",
        elapsed.as_secs_f64() * 1000.0,
        10_000.0 / elapsed.as_secs_f64(),
        sink,
    );
}
