# Julia 损失函数（Loss Functions）：均方误差（MSE）、平均绝对误差（MAE）、二元交叉熵（Binary Cross-Entropy）、
# 类别交叉熵（Categorical Cross-Entropy）+ Softmax，以及用于不均衡分类的焦点损失（Focal Loss），
# 每种损失都附有解析梯度（Analytical Gradient）。
# 仅使用标准库。来源：
#   https://arxiv.org/abs/1708.02002  （焦点损失 Focal Loss：Lin 等）
#   https://docs.julialang.org/en/v1/base/math/

using Random
using Statistics
using Printf


function mse(preds::Vector{Float64}, targets::Vector{Float64})::Float64
    @assert length(preds) == length(targets)
    return sum((preds .- targets) .^ 2) / length(preds)
end


function mse_grad(preds::Vector{Float64}, targets::Vector{Float64})::Vector{Float64}
    @assert length(preds) == length(targets)
    n = length(preds)
    return 2.0 .* (preds .- targets) ./ n
end


function mae(preds::Vector{Float64}, targets::Vector{Float64})::Float64
    @assert length(preds) == length(targets)
    return sum(abs.(preds .- targets)) / length(preds)
end


function mae_grad(preds::Vector{Float64}, targets::Vector{Float64})::Vector{Float64}
    @assert length(preds) == length(targets)
    n = length(preds)
    return sign.(preds .- targets) ./ n
end


function binary_cross_entropy(preds::Vector{Float64}, targets::Vector{Float64};
                              eps::Float64=1e-15)::Float64
    @assert length(preds) == length(targets)
    n = length(preds)
    total = 0.0
    for i in 1:n
        p = clamp(preds[i], eps, 1 - eps)
        t = targets[i]
        total += -(t * log(p) + (1 - t) * log(1 - p))
    end
    return total / n
end


function bce_grad(preds::Vector{Float64}, targets::Vector{Float64};
                  eps::Float64=1e-15)::Vector{Float64}
    n = length(preds)
    grads = zeros(Float64, n)
    for i in 1:n
        p = clamp(preds[i], eps, 1 - eps)
        t = targets[i]
        grads[i] = (-(t / p) + (1 - t) / (1 - p)) / n
    end
    return grads
end


function softmax(logits::Vector{Float64})::Vector{Float64}
    m = maximum(logits)
    exps = exp.(logits .- m)
    return exps ./ sum(exps)
end


# target_index 从 0 开始索引，与 Python 课程一致。
function categorical_cross_entropy(logits::Vector{Float64}, target_index::Int;
                                   eps::Float64=1e-15)::Float64
    probs = softmax(logits)
    p = max(eps, probs[target_index + 1])
    return -log(p)
end


function cce_grad(logits::Vector{Float64}, target_index::Int)::Vector{Float64}
    probs = softmax(logits)
    grads = copy(probs)
    grads[target_index + 1] -= 1.0
    return grads
end


# 用于二分类（Sigmoid 输出）的焦点损失（Focal Loss）。
# 通过 (1 - p_t)^gamma 降低简单样本的权重，使模型
# 聚焦困难样本，适合类别不均衡（Class Imbalance）问题。
function focal_loss(preds::Vector{Float64}, targets::Vector{Float64};
                    gamma::Float64=2.0, alpha::Float64=0.25,
                    eps::Float64=1e-15)::Float64
    @assert length(preds) == length(targets)
    n = length(preds)
    total = 0.0
    for i in 1:n
        p = clamp(preds[i], eps, 1 - eps)
        t = targets[i]
        pt = t * p + (1 - t) * (1 - p)
        at = t * alpha + (1 - t) * (1 - alpha)
        total += -at * (1 - pt) ^ gamma * log(pt)
    end
    return total / n
end


function focal_grad(preds::Vector{Float64}, targets::Vector{Float64};
                    gamma::Float64=2.0, alpha::Float64=0.25,
                    eps::Float64=1e-15)::Vector{Float64}
    n = length(preds)
    grads = zeros(Float64, n)
    for i in 1:n
        p = clamp(preds[i], eps, 1 - eps)
        t = targets[i]
        pt = t * p + (1 - t) * (1 - p)
        at = t * alpha + (1 - t) * (1 - alpha)
        # d(pt)/d(p) = 2t - 1（t==1 时为 1，t==0 时为 -1）。
        dpt_dp = 2 * t - 1
        # 通过链式法则（Chain Rule）应用 d/dp [-(1-pt)^gamma * log(pt)]。
        base = (1 - pt) ^ (gamma - 1)
        term = base * (gamma * log(pt) - (1 - pt) / pt)
        grads[i] = at * term * dpt_dp / n
    end
    return grads
end


function sigmoid(x::Float64)::Float64
    return 1.0 / (1.0 + exp(-clamp(x, -500.0, 500.0)))
end


function make_circle_data(; n::Int=200, seed::Int=42)
    rng = MersenneTwister(seed)
    data = Tuple{Vector{Float64}, Float64}[]
    for _ in 1:n
        x = rand(rng) * 4 - 2
        y = rand(rng) * 4 - 2
        label = x * x + y * y < 1.5 ? 1.0 : 0.0
        push!(data, (Float64[x, y], label))
    end
    return data
end


mutable struct LossNetwork
    loss_type::Symbol  # :mse 或 :bce
    lr::Float64
    hidden_size::Int
    w1::Matrix{Float64}
    b1::Vector{Float64}
    w2::Vector{Float64}
    b2::Float64
    x::Vector{Float64}
    z1::Vector{Float64}
    h::Vector{Float64}
    out::Float64
end

function LossNetwork(loss_type::Symbol; hidden_size::Int=8, lr::Float64=0.1, seed::Int=0)
    loss_type in (:mse, :bce) ||
        throw(ArgumentError("LossNetwork：loss_type 必须为 :mse 或 :bce，实际收到 :$loss_type"))
    rng = MersenneTwister(seed)
    return LossNetwork(
        loss_type, lr, hidden_size,
        randn(rng, hidden_size, 2) .* 0.5,
        zeros(Float64, hidden_size),
        randn(rng, hidden_size) .* 0.5,
        0.0,
        Float64[], zeros(Float64, hidden_size), zeros(Float64, hidden_size), 0.0,
    )
end


function forward!(net::LossNetwork, x::Vector{Float64})::Float64
    net.x = x
    for i in 1:net.hidden_size
        z = net.w1[i, 1] * x[1] + net.w1[i, 2] * x[2] + net.b1[i]
        net.z1[i] = z
        net.h[i] = max(0.0, z)
    end
    z2 = sum(net.w2 .* net.h) + net.b2
    net.out = sigmoid(z2)
    return net.out
end


function backward!(net::LossNetwork, target::Float64)
    eps = 1e-15
    p = clamp(net.out, eps, 1 - eps)
    d_loss = net.loss_type == :mse ? 2.0 * (net.out - target) :
                                     -(target / p) + (1 - target) / (1 - p)
    d_sig = net.out * (1 - net.out)
    d_out = d_loss * d_sig
    for i in 1:net.hidden_size
        d_relu = net.z1[i] > 0 ? 1.0 : 0.0
        d_h = d_out * net.w2[i] * d_relu
        net.w2[i] -= net.lr * d_out * net.h[i]
        net.w1[i, 1] -= net.lr * d_h * net.x[1]
        net.w1[i, 2] -= net.lr * d_h * net.x[2]
        net.b1[i] -= net.lr * d_h
    end
    net.b2 -= net.lr * d_out
end


function compute_loss(net::LossNetwork, pred::Float64, target::Float64)::Float64
    eps = 1e-15
    p = clamp(pred, eps, 1 - eps)
    return net.loss_type == :mse ? (pred - target) ^ 2 :
           -(target * log(p) + (1 - target) * log(1 - p))
end


function train!(net::LossNetwork, data::Vector{Tuple{Vector{Float64}, Float64}};
                epochs::Int=200)
    history = Tuple{Float64, Float64}[]
    for epoch in 0:(epochs - 1)
        total = 0.0
        correct = 0
        for (x, y) in data
            pred = forward!(net, x)
            backward!(net, y)
            total += compute_loss(net, pred, y)
            if (pred >= 0.5) == (y >= 0.5)
                correct += 1
            end
        end
        avg = total / length(data)
        acc = correct / length(data) * 100
        push!(history, (avg, acc))
        if epoch % 50 == 0 || epoch == epochs - 1
            @printf("    轮次（Epoch）%3d：损失=%.4f，准确率=%.1f%%\n", epoch, avg, acc)
        end
    end
    return history
end


function main()
    println("=" ^ 60)
    println("步骤 1：均方误差损失（MSE Loss）")
    println("=" ^ 60)
    preds = Float64[0.9, 0.1, 0.7, 0.4]
    targets = Float64[1.0, 0.0, 1.0, 0.0]
    println("  预测值（Predictions）： $preds")
    println("  目标值（Targets）：     $targets")
    @printf("  均方误差损失（MSE Loss）：    %.6f\n", mse(preds, targets))
    println("  MSE 梯度（Grads）：   $(round.(mse_grad(preds, targets), digits=4))")

    println("\n" * "=" ^ 60)
    println("步骤 2：平均绝对误差损失（MAE Loss）")
    println("=" ^ 60)
    @printf("  平均绝对误差损失（MAE Loss）：    %.6f\n", mae(preds, targets))
    println("  MAE 梯度（Grads）：   $(round.(mae_grad(preds, targets), digits=4))")

    println("\n" * "=" ^ 60)
    println("步骤 3：二元交叉熵（Binary Cross-Entropy）")
    println("=" ^ 60)
    @printf("  二元交叉熵损失（BCE Loss）：    %.6f\n", binary_cross_entropy(preds, targets))
    println("  BCE 梯度（Grads）：   $(round.(bce_grad(preds, targets), digits=4))")

    println("\n  不同置信度（Confidence）下的交叉熵（CE）损失（真实标签 = 1）：")
    for conf in [0.01, 0.1, 0.5, 0.9, 0.99]
        ce = -log(max(1e-15, conf))
        ms = (conf - 1.0) ^ 2
        @printf("    p=%.2f: CE=%.4f, MSE=%.4f, 比值=%.1fx\n", conf, ce, ms, ce / max(0.0001, ms))
    end

    println("\n" * "=" ^ 60)
    println("步骤 4：类别交叉熵（Categorical Cross-Entropy）+ Softmax")
    println("=" ^ 60)
    logits = Float64[2.0, 1.0, 0.1, -1.0, 3.0]
    target_idx = 4   # 从 0 开始索引；第 5 个类别
    probs = softmax(logits)
    println("  未归一化得分（Logits）：  $logits")
    println("  Softmax: $(round.(probs, digits=4))")
    println("  目标类别： $target_idx")
    @printf("  类别交叉熵损失（CCE Loss）： %.6f\n", categorical_cross_entropy(logits, target_idx))
    println("  梯度（Gradient）： $(round.(cce_grad(logits, target_idx), digits=4))")

    println("\n" * "=" ^ 60)
    println("步骤 5：焦点损失（Focal Loss，处理类别不均衡）")
    println("=" ^ 60)
    # 展示焦点损失如何相对于困难样本降低易于正确分类样本的权重。
    println("  真实标签 = 1 时，焦点调制因子（Focal Modulator）(1 - pt)^gamma 的作用：")
    for p in [0.05, 0.5, 0.95]
        pt = p
        modulator = (1 - pt) ^ 2.0
        ce = -log(max(1e-15, pt))
        focal = modulator * ce
        @printf("    p=%.2f  CE=%.4f  调制因子（modulator）=(1-pt)^2=%.4f  Focal=%.4f\n", p, ce, modulator, focal)
    end

    # 混合批次（Batch）：预测对了一半，gamma=2，alpha=0.25。
    @printf("\n  批次焦点损失（Focal Loss，gamma=2，alpha=0.25）： %.6f\n",
            focal_loss(preds, targets))
    println("  批次焦点损失梯度（Focal Grads）： $(round.(focal_grad(preds, targets), digits=4))")
    @printf("\n  用于比较的批次 BCE： %.6f\n", binary_cross_entropy(preds, targets))

    println("\n" * "=" ^ 60)
    println("步骤 6：分类任务中的 MSE 与二元交叉熵（BCE）")
    println("=" ^ 60)
    data = make_circle_data()
    for loss_type in [:mse, :bce]
        println("\n--- 使用 $(uppercase(string(loss_type))) 训练 ---")
        net = LossNetwork(loss_type; hidden_size=8, lr=0.1)
        history = train!(net, data; epochs=200)
        final_loss, final_acc = history[end]
        @printf("  最终：损失=%.4f，准确率=%.1f%%\n", final_loss, final_acc)
    end

    println("\n=== 关键结论（Key Takeaway） ===")
    println("  交叉熵在分类任务上收敛更快，因为它的")
    println("  梯度在预测错误时仍然较强。由于 Sigmoid 饱和，MSE 在")
    println("  接近 0 和 1 时变平。焦点损失增加了一个")
    println("  调制因子，进一步聚焦困难样本。")
end


if abspath(PROGRAM_FILE) == @__FILE__
    main()
end
