import math
import random


def sigmoid(x):
    x = max(-500.0, min(500.0, x))
    return 1.0 / (1.0 + math.exp(-x))


class Layer:
    def __init__(self, n_inputs, n_neurons, weights=None, biases=None):
        if weights is not None:
            self.weights = weights
        else:
            self.weights = [
                [random.uniform(-1, 1) for _ in range(n_inputs)]
                for _ in range(n_neurons)
            ]
        if biases is not None:
            self.biases = biases
        else:
            self.biases = [0.0] * n_neurons

    def forward(self, inputs):
        self.last_input = inputs
        self.last_output = []
        for neuron_idx in range(len(self.weights)):
            z = sum(
                w * x for w, x in zip(self.weights[neuron_idx], inputs)
            )
            z += self.biases[neuron_idx]
            self.last_output.append(sigmoid(z))
        return self.last_output


class Network:
    def __init__(self, layers):
        self.layers = layers

    def forward(self, inputs):
        current = inputs
        for layer in self.layers:
            current = layer.forward(current)
        return current

    def count_parameters(self):
        total = 0
        for layer in self.layers:
            for neuron_weights in layer.weights:
                total += len(neuron_weights)
            total += len(layer.biases)
        return total


if __name__ == "__main__":
    print("=" * 60)
    print("演示 1：使用手工调参的 2-2-1 网络实现异或（XOR）")
    print("=" * 60)

    hidden = Layer(
        n_inputs=2,
        n_neurons=2,
        weights=[[20.0, 20.0], [-20.0, -20.0]],
        biases=[-10.0, 30.0],
    )

    output = Layer(
        n_inputs=2,
        n_neurons=1,
        weights=[[20.0, 20.0]],
        biases=[-30.0],
    )

    xor_net = Network([hidden, output])

    xor_data = [
        ([0, 0], 0),
        ([0, 1], 1),
        ([1, 0], 1),
        ([1, 1], 0),
    ]

    all_correct = True
    for inputs, expected in xor_data:
        result = xor_net.forward(inputs)
        predicted = 1 if result[0] >= 0.5 else 0
        status = "正确（OK）" if predicted == expected else "错误（Wrong）"
        if predicted != expected:
            all_correct = False
        print(f"  {inputs} -> {result[0]:.6f} (取整结果： {predicted}, 预期： {expected}) {status}")

    print(f"\n是否成功实现 XOR： {all_correct}")
    print(f"参数数量（Parameters）： {xor_net.count_parameters()}")

    print()
    print("=" * 60)
    print("演示 2：使用 2-8-1 网络进行圆内外分类")
    print("=" * 60)

    random.seed(42)

    data = []
    for _ in range(200):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        label = 1 if (x * x + y * y) < 0.25 else 0
        data.append(([x, y], label))

    inside_count = sum(1 for _, label in data if label == 1)
    outside_count = len(data) - inside_count
    print(f"  数据集：{len(data)} 个点（圆内 {inside_count} 个，圆外 {outside_count} 个）")

    random.seed(7)
    circle_net = Network([
        Layer(n_inputs=2, n_neurons=8),
        Layer(n_inputs=8, n_neurons=1),
    ])

    correct = 0
    for inputs, expected in data:
        result = circle_net.forward(inputs)
        predicted = 1 if result[0] >= 0.5 else 0
        if predicted == expected:
            correct += 1

    print(f"  随机权重下的准确率（Accuracy）： {correct}/{len(data)} ({100 * correct / len(data):.1f}%)")
    print(f"  参数数量（Parameters）： {circle_net.count_parameters()}")
    print(f"  （随机权重的准确率较差，需要训练）")

    print()
    print("=" * 60)
    print("演示 3：XOR 的前向传播（Forward Pass）内部过程")
    print("=" * 60)

    for inputs, expected in xor_data:
        xor_net.forward(inputs)
        h = xor_net.layers[0].last_output
        o = xor_net.layers[1].last_output
        print(f"  输入（Input）： {inputs}")
        print(f"    隐藏层（Hidden）： [{h[0]:.6f}, {h[1]:.6f}]")
        print(f"    输出（Output）： {o[0]:.6f} -> {'1' if o[0] >= 0.5 else '0'} (预期： {expected})")

    print()
    print("=" * 60)
    print("演示 4：经典架构的参数数量")
    print("=" * 60)

    architectures = [
        ("2-3-1 （本课）", [2, 3, 1]),
        ("2-8-1 （圆内外分类）", [2, 8, 1]),
        ("784-256-128-10 (MNIST)", [784, 256, 128, 10]),
        ("784-512-256-128-10 （深层 MNIST）", [784, 512, 256, 128, 10]),
    ]

    for name, sizes in architectures:
        layers = []
        for i in range(1, len(sizes)):
            layers.append(Layer(n_inputs=sizes[i - 1], n_neurons=sizes[i]))
        net = Network(layers)
        print(f"  {name}: {net.count_parameters():,} 个参数")
