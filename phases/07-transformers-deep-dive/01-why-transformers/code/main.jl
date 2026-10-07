# 用 Julia 演示为何使用 Transformer。比较 RNN 风格串行递归与
# 注意力（Attention）风格并行归约（Parallel reduction），验证 Hillis-Steele
# 并行前缀扫描（Parallel prefix scan）与串行扫描一致。仅用标准库。来源:
#   https://docs.julialang.org/en/v1/manual/control-flow/
#   https://docs.julialang.org/en/v1/base/base/
#   https://en.wikipedia.org/wiki/Prefix_sum

using Printf


function rnn_style(xs::Vector{Float64}; decay::Float64=0.9)::Float64
    h = 0.0
    for x in xs
        h = decay * h + x
    end
    return h
end


function attention_style(xs::Vector{Float64})::Float64
    isempty(xs) && throw(ArgumentError("xs 不得为空"))
    return sum(xs) / length(xs)
end


function serial_scan(xs::Vector{Float64})::Vector{Float64}
    out = similar(xs)
    acc = 0.0
    @inbounds for i in 1:length(xs)
        acc += xs[i]
        out[i] = acc
    end
    return out
end


function parallel_scan(xs::Vector{Float64})::Vector{Float64}
    out = copy(xs)
    n = length(out)
    step = 1
    while step < n
        new_out = copy(out)
        for i in (step + 1):n
            new_out[i] = out[i] + out[i - step]
        end
        out = new_out
        step *= 2
    end
    return out
end


function benchmark_pair(n::Int; reps::Int=3)
    n > 0 || throw(ArgumentError("n 必须 > 0"))
    xs = [0.001 * mod(i, 17) for i in 0:(n - 1)]
    best_rnn = Inf
    for _ in 1:reps
        t0 = time_ns()
        rnn_style(xs)
        best_rnn = min(best_rnn, (time_ns() - t0) / 1e9)
    end
    best_attn = Inf
    for _ in 1:reps
        t0 = time_ns()
        attention_style(xs)
        best_attn = min(best_attn, (time_ns() - t0) / 1e9)
    end
    return best_rnn, best_attn
end


function depth_counts(n::Int)
    n > 0 || throw(ArgumentError("n 必须 > 0"))
    rnn_depth = n
    attn_depth = max(1, Int(ceil(log2(n))))
    return rnn_depth, attn_depth
end


function demo_depth_table()
    println("=== 串行深度（Serial depth）比较 ===")
    @printf("%8s  %12s  %12s  %16s\n", "N", "RNN 深度", "注意力深度", "加速比（运算）")
    for n in (64, 512, 4096, 32768, 262144)
        rd, ad = depth_counts(n)
        @printf("%8d  %12d  %12d  %15.0fx\n", n, rd, ad, rd / ad)
    end
    println()
end


function demo_wallclock()
    println("=== 本机墙钟时间（Wall-clock，纯 Julia） ===")
    @printf("%8s  %10s  %10s  %8s\n", "N", "rnn (ms)", "attn (ms)", "比值（Ratio）")
    for n in (1_000, 10_000, 100_000, 1_000_000)
        rnn_t, attn_t = benchmark_pair(n)
        ratio = attn_t > 0 ? rnn_t / attn_t : Inf
        @printf("%8d  %10.2f  %10.2f  %7.1fx\n",
                n, rnn_t * 1000, attn_t * 1000, ratio)
    end
    println()
end


function demo_scan_equivalence()
    println("=== 前缀和（Prefix sum）等价性检查 ===")
    xs = Float64.(0:15)
    ser = serial_scan(xs)
    par = parallel_scan(xs)
    mismatches = sum(1 for i in 1:length(xs) if abs(ser[i] - par[i]) > 1e-9)
    @printf("长度: %d  串行与并行扫描不匹配数: %d\n",
            length(xs), mismatches)
    @printf("最后一个值（串行）:   %.4f\n", ser[end])
    @printf("最后一个值（并行）: %.4f\n", par[end])
    println()
end


function main()
    demo_depth_table()
    demo_wallclock()
    demo_scan_equivalence()
    println("要点：注意力可并行化归约；在实际 GPU 内核（Kernel）上")
    println("深度为 O(log N)。完整注意力（Full attention）的内存开销为 O(N^2)；")
    println("后续课程将展开说明这一权衡（Trade-off）。")
end


if abspath(PROGRAM_FILE) == @__FILE__
    main()
end
