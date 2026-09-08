# Julia 感知机（Perceptron）与单隐藏层多层感知机（MLP）。单层 Rosenblatt
# 感知机处理 AND/OR/NOT，再用手工连接的 XOR 网络展示
# 单个感知机为何无法处理 XOR，最后训练一个 2-2-1 Sigmoid MLP，
# 使用手工实现的反向传播（Backpropagation）。
# 仅使用标准库。来源：
#   https://en.wikipedia.org/wiki/Perceptron
#   https://docs.julialang.org/en/v1/manual/types/#Composite-Types

using Random
using Printf


mutable struct Perceptron
    weights::Vector{Float64}
    bias::Float64
    lr::Float64
end

Perceptron(n_inputs::Int; lr::Float64=0.1) =
    Perceptron(zeros(Float64, n_inputs), 0.0, lr)


function predict(p::Perceptron, inputs::Vector{Float64})::Int
    return sum(p.weights .* inputs) + p.bias >= 0 ? 1 : 0
end


function train!(p::Perceptron, data::Vector{Tuple{Vector{Float64}, Int}}; epochs::Int=100)
    for epoch in 1:epochs
        errors = 0
        for (inputs, target) in data
            pred = predict(p, inputs)
            err = target - pred
            if err != 0
                errors += 1
                p.weights .+= p.lr * err .* inputs
                p.bias += p.lr * err
            end
        end
        if errors == 0
            println("在第 $epoch 轮（Epoch）收敛")
            return
        end
    end
    println("经过 $epochs 轮（Epochs）仍未收敛")
end


function test_gate(name::String, n_inputs::Int, data::Vector{Tuple{Vector{Float64}, Int}})
    println("=== $name ===")
    p = Perceptron(n_inputs)
    train!(p, data)
    println("  权重（Weights）： $(p.weights), 偏置（Bias）： $(p.bias)")
    for (inputs, expected) in data
        result = predict(p, inputs)
        status = result == expected ? "正确（OK）" : "错误（Wrong）"
        println("  $inputs -> $result (预期 $expected) $status")
    end
    println()
end


# 通过 OR + NAND + AND 手工连接 XOR 网络，展示两层
# 感知机网络能够计算 XOR，而单个感知机不行。
function xor_network(x1::Float64, x2::Float64)::Int
    or_neuron = Perceptron(2)
    or_neuron.weights = Float64[1.0, 1.0]
    or_neuron.bias = -0.5

    nand_neuron = Perceptron(2)
    nand_neuron.weights = Float64[-1.0, -1.0]
    nand_neuron.bias = 1.5

    and_neuron = Perceptron(2)
    and_neuron.weights = Float64[1.0, 1.0]
    and_neuron.bias = -1.5

    h1 = predict(or_neuron, Float64[x1, x2])
    h2 = predict(nand_neuron, Float64[x1, x2])
    return predict(and_neuron, Float64[h1, h2])
end


# 小型可训练 MLP：2 个输入 -> 2 个隐藏 Sigmoid 神经元 -> 1 个 Sigmoid 输出。
mutable struct TwoLayerNetwork
    w_hidden::Matrix{Float64}    # 2x2
    b_hidden::Vector{Float64}    # 2
    w_output::Vector{Float64}    # 2
    b_output::Float64
    lr::Float64
    # 反向传播（Backpropagation）缓存
    last_input::Vector{Float64}
    hidden_out::Vector{Float64}
    output::Float64
end

function TwoLayerNetwork(; lr::Float64=2.0, seed::Int=0)
    rng = MersenneTwister(seed)
    return TwoLayerNetwork(
        rand(rng, 2, 2) .* 2 .- 1,
        rand(rng, 2) .* 2 .- 1,
        rand(rng, 2) .* 2 .- 1,
        rand(rng) * 2 - 1,
        lr,
        Float64[],
        zeros(Float64, 2),
        0.0,
    )
end


sigmoid(x::Float64)::Float64 = 1.0 / (1.0 + exp(-clamp(x, -500.0, 500.0)))


function forward!(net::TwoLayerNetwork, inputs::Vector{Float64})::Float64
    net.last_input = inputs
    for i in 1:2
        z = net.w_hidden[i, 1] * inputs[1] + net.w_hidden[i, 2] * inputs[2] + net.b_hidden[i]
        net.hidden_out[i] = sigmoid(z)
    end
    z_out = net.w_output[1] * net.hidden_out[1] + net.w_output[2] * net.hidden_out[2] + net.b_output
    net.output = sigmoid(z_out)
    return net.output
end


function backward!(net::TwoLayerNetwork, target::Float64)
    err = target - net.output
    d_output = err * net.output * (1 - net.output)
    saved_w_output = copy(net.w_output)
    hidden_deltas = zeros(Float64, 2)
    for i in 1:2
        h = net.hidden_out[i]
        hidden_deltas[i] = d_output * saved_w_output[i] * h * (1 - h)
    end
    for i in 1:2
        net.w_output[i] += net.lr * d_output * net.hidden_out[i]
    end
    net.b_output += net.lr * d_output
    for i in 1:2, j in 1:2
        net.w_hidden[i, j] += net.lr * hidden_deltas[i] * net.last_input[j]
    end
    for i in 1:2
        net.b_hidden[i] += net.lr * hidden_deltas[i]
    end
end


function train!(net::TwoLayerNetwork, data::Vector{Tuple{Vector{Float64}, Float64}};
                epochs::Int=10000)
    for epoch in 0:(epochs - 1)
        total_err = 0.0
        for (inputs, target) in data
            out = forward!(net, inputs)
            total_err += (target - out) ^ 2
            backward!(net, target)
        end
        if epoch % 2000 == 0
            @printf("  轮次（Epoch）%d，误差（Error）： %.4f\n", epoch, total_err)
        end
    end
end


function main()
    and_data = Tuple{Vector{Float64}, Int}[
        (Float64[0, 0], 0),
        (Float64[0, 1], 0),
        (Float64[1, 0], 0),
        (Float64[1, 1], 1),
    ]
    or_data = Tuple{Vector{Float64}, Int}[
        (Float64[0, 0], 0),
        (Float64[0, 1], 1),
        (Float64[1, 0], 1),
        (Float64[1, 1], 1),
    ]
    not_data = Tuple{Vector{Float64}, Int}[
        (Float64[0], 1),
        (Float64[1], 0),
    ]
    xor_data = Tuple{Vector{Float64}, Int}[
        (Float64[0, 0], 0),
        (Float64[0, 1], 1),
        (Float64[1, 0], 1),
        (Float64[1, 1], 0),
    ]

    test_gate("与门（AND Gate）", 2, and_data)
    test_gate("或门（OR Gate）", 2, or_data)
    test_gate("非门（NOT Gate）", 1, not_data)

    println("=== 异或门（XOR Gate） (单个感知机（Perceptron），无法实现) ===")
    p_xor = Perceptron(2)
    train!(p_xor, xor_data; epochs=1000)
    for (inputs, expected) in xor_data
        result = predict(p_xor, inputs)
        status = result == expected ? "正确（OK）" : "错误（Wrong）"
        println("  $inputs -> $result (预期 $expected) $status")
    end
    println()

    println("=== 异或门（XOR Gate） (多层网络（Multi-layer Network），能够实现) ===")
    for (inputs, expected) in xor_data
        result = xor_network(inputs[1], inputs[2])
        status = result == expected ? "正确（OK）" : "错误（Wrong）"
        println("  $inputs -> $result (预期 $expected) $status")
    end
    println()

    println("=== 异或门（XOR Gate） (使用反向传播（Backpropagation）训练的 2 层网络) ===")
    xor_train = Tuple{Vector{Float64}, Float64}[
        (Float64[0, 0], 0.0),
        (Float64[0, 1], 1.0),
        (Float64[1, 0], 1.0),
        (Float64[1, 1], 0.0),
    ]
    net = TwoLayerNetwork(lr=2.0)
    train!(net, xor_train; epochs=10000)
    println()
    for (inputs, expected) in xor_train
        result = forward!(net, inputs)
        predicted = result >= 0.5 ? 1 : 0
        @printf("  %s -> %.4f (取整结果： %d, 预期 %d)\n", inputs, result, predicted, Int(expected))
    end
end


if abspath(PROGRAM_FILE) == @__FILE__
    main()
end
