# JAX 入门（Introduction to JAX）

> PyTorch 修改张量，TensorFlow 构建计算图，JAX 编译纯函数。最后一种方式会改变你思考深度学习的方式。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 03 第 01-10 课，NumPy 基础
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 使用 JAX 函数式 API（jax.numpy、jax.grad、jax.jit、jax.vmap）编写纯函数神经网络代码
- 解释 PyTorch 即时修改模型与 JAX 函数式编译模型的关键设计差异
- 应用 jit 编译与 vmap 向量化，相比朴素 Python 加速训练循环
- 在 JAX 中训练简单网络，对比其显式状态管理与 PyTorch 面向对象方式

## 问题（The Problem）

你已会用 PyTorch 构建神经网络：定义 `nn.Module`，调用 `.backward()`，执行优化器更新。它有效，数百万人都在用。

但 PyTorch 的设计中有一个固有限制：它在 Python 中即时逐项追踪操作。每个 `tensor + tensor` 都是一次独立内核启动，每个训练步骤都会重新解释相同 Python 代码。直到需要在 2,048 个 TPU 上训练 5400 亿参数模型之前，这都没问题；到了那个规模，开销就难以承受。

Google DeepMind 用 JAX 训练 Gemini，Anthropic 用 JAX 训练过 Claude。这些不是小规模作业，而是地球上规模最大的神经网络训练。他们选择 JAX，因为它把训练循环视为可编译程序，而不是一串 Python 调用。

JAX 就是拥有三项超能力的 NumPy：自动微分（Automatic Differentiation）、面向 XLA 的即时编译（JIT）以及自动向量化（Automatic Vectorization）。你编写处理单样本的函数，JAX 给出一个能处理批次、计算梯度、编译为机器码并跨设备运行的函数，而原始函数完全不用改。

## 概念（The Concept）

### JAX 的理念（The JAX Philosophy）

JAX 是函数式框架。没有类，没有可变状态，没有 `.backward()` 方法，取而代之的是：

| PyTorch | JAX |
|---------|-----|
| 带状态的 `nn.Module` 类 | 纯函数：`f(params, x) -> y` |
| `loss.backward()` | `jax.grad(loss_fn)(params, x, y)` |
| 即时执行（Eager Execution） | 通过 XLA 进行 JIT 编译 |
| 手动 `for x in batch:` 循环 | `jax.vmap(f)` 自动向量化 |
| `DataParallel` / `FSDP` | `jax.pmap(f)` 自动并行 |
| 可变的 `model.parameters()` | 不可变数组树（Pytree） |

这不是风格偏好，而是编译器约束。JIT 编译要求纯函数（Pure Function）：相同输入始终得到相同输出，没有副作用。这种限制让 100x 加速成为可能。

### jax.numpy：熟悉的接口（jax.numpy: The Familiar Surface）

JAX 在加速器上重新实现 NumPy API：

```python
import jax.numpy as jnp

a = jnp.array([1.0, 2.0, 3.0])
b = jnp.array([4.0, 5.0, 6.0])
c = jnp.dot(a, b)
```

相同函数名、相同广播规则、相同切片语义。但数组位于 GPU/TPU 上，每项操作都可被编译器追踪。

一个关键区别：JAX 数组不可变，不能写 `a[0] = 5`，而要写 `a = a.at[0].set(5)`。头一周可能不习惯，之后就会明白：正是不可变性让 `grad`、`jit`、`vmap` 等变换可以组合。

### jax.grad：函数式自动微分（jax.grad: Functional Autodiff）

PyTorch 将梯度附在张量上（`.grad`），JAX 将梯度关联到函数。

```python
import jax

def f(x):
    return x ** 2

df = jax.grad(f)
df(3.0)
```

`jax.grad` 接收一个函数，返回计算梯度的新函数。不调用 `.backward()`，张量上也不保存计算图。梯度只是另一个可调用、可组合、可 JIT 编译的函数。

这可以任意组合：

```python
d2f = jax.grad(jax.grad(f))
d2f(3.0)
```

二阶导数、三阶导数、Jacobian 矩阵、Hessian 矩阵，都可以通过组合 `grad` 得到。PyTorch 也能做（`torch.autograd.functional.hessian`），但属于后加功能，在 JAX 中则是基础。

限制是：`grad` 只适用于纯函数。内部不能放打印语句，因为它们在追踪时而非执行时运行；不能修改外部状态；不显式管理随机键，就不能生成随机数。

### jit：编译到 XLA（jit: Compile to XLA）

```python
@jax.jit
def train_step(params, x, y):
    loss = loss_fn(params, x, y)
    return loss

fast_step = jax.jit(train_step)
```

第一次调用时，JAX 追踪函数，记录发生了哪些操作，而不执行它们。然后将轨迹交给 XLA（加速线性代数，Accelerated Linear Algebra），即 Google 面向 TPU 和 GPU 的编译器。XLA 融合操作，消除冗余内存复制，生成优化机器码。

后续调用完全跳过 Python，编译后的代码以 C++ 速度在加速器上运行。

JIT 有帮助的场景：
- 训练步骤：相同计算重复数千次
- 推理：相同模型，不同输入
- 使用相近形状输入调用超过一次的任何函数

JIT 有负面影响的场景：
- Python 控制流依赖数值的函数，例如 `if x > 0`，其中 x 是被追踪数组
- 一次性计算：编译开销超过运行时间
- 调试：追踪掩盖实际执行过程

控制流限制确实存在。用 `jax.lax.cond` 替代 `if/else`，用 `jax.lax.scan` 替代 `for` 循环。它们不是可选项，而是编译的代价。

### vmap：自动向量化（vmap: Automatic Vectorization）

先编写处理一个样本的函数：

```python
def predict(params, x):
    return jnp.dot(params['w'], x) + params['b']
```

`vmap` 将其提升为批处理函数：

```python
batch_predict = jax.vmap(predict, in_axes=(None, 0))
```

`in_axes=(None, 0)` 表示不沿 `params` 批处理（共享参数），沿 `x` 的第 0 轴批处理。无需手动 `for` 循环，无需重塑形状，也无需在代码中逐处传递批次维度。JAX 自动识别批次维度并向量化整个计算。

这不是语法糖。`vmap` 生成融合后的向量化代码，比 Python 循环快 10-100x，并能与 `jit`、`grad` 组合：

```python
per_example_grads = jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0))
```

逐样本梯度，只需一行。在 PyTorch 中，不用变通手段几乎做不到。

### pmap：跨设备数据并行（pmap: Data Parallelism Across Devices）

```python
parallel_step = jax.pmap(train_step, axis_name='devices')
```

`pmap` 将函数复制到所有可用 GPU/TPU，并拆分批次。函数内部通过 `jax.lax.pmean` 和 `jax.lax.psum` 跨设备同步梯度。

Google 使用 `pmap` 及其后继 `shard_map`，在数千个 TPU v5e 芯片上训练 Gemini。编程模型是：写单设备版本，套上 `pmap`，完成。

### Pytree：通用数据结构（Pytrees: The Universal Data Structure）

JAX 操作“树结构（Pytree）”，即列表、元组、字典和数组的嵌套组合。模型参数就是一个 Pytree：

```python
params = {
    'layer1': {'w': jnp.zeros((784, 256)), 'b': jnp.zeros(256)},
    'layer2': {'w': jnp.zeros((256, 128)), 'b': jnp.zeros(128)},
    'layer3': {'w': jnp.zeros((128, 10)),  'b': jnp.zeros(10)},
}
```

每种 JAX 变换，包括 `grad`、`jit`、`vmap`，都知道如何遍历 Pytree。`jax.tree.map(f, tree)` 将 `f` 应用于每个叶子节点，优化器因此能一次更新全部参数：

```python
params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
```

没有 `.parameters()` 方法，不需要参数注册，树结构本身就是模型。

### 函数式与面向对象（Functional vs Object-Oriented）

PyTorch 将状态保存在对象中：

```python
class Model(nn.Module):
    def __init__(self):
        self.linear = nn.Linear(784, 10)

    def forward(self, x):
        return self.linear(x)
```

JAX 使用带显式状态的纯函数：

```python
def predict(params, x):
    return jnp.dot(x, params['w']) + params['b']
```

参数由外部传入，不存储任何状态，也不修改任何值。因此每个函数都可测试、可组合、可编译。这也意味着你必须自己管理参数，或者使用 Flax、Equinox 等库。

### JAX 生态（The JAX Ecosystem）

JAX 提供基础组件，其他库提供易用性：

| 库 | 作用 | 风格 |
|---------|------|-------|
| **Flax**（Google） | 神经网络层 | 带显式状态的 `nn.Module` |
| **Equinox**（Patrick Kidger） | 神经网络层 | 基于 Pytree，符合 Python 习惯 |
| **Optax**（DeepMind） | 优化器与学习率调度 | 可组合梯度变换 |
| **Orbax**（Google） | 检查点（Checkpointing） | 保存/恢复 Pytree |
| **CLU**（Google） | 指标与日志 | 训练循环工具 |

Optax 是标准优化器库。它将梯度变换（Adam、SGD、裁剪）与参数更新分开，让组合变得简单：

```python
optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adam(learning_rate=1e-3),
)
```

### 何时选择 JAX 或 PyTorch（When to Use JAX vs PyTorch）

| 因素 | JAX | PyTorch |
|--------|-----|---------|
| TPU 支持 | 一等支持，Google 构建了两者 | 社区维护（torch_xla） |
| GPU 支持 | 良好（通过 XLA 使用 CUDA） | 领先（原生 CUDA） |
| 调试 | 困难（追踪与编译） | 容易（即时、逐行） |
| 生态 | 面向研究（Flax、Equinox） | 庞大（HuggingFace、torchvision 等） |
| 招聘 | 小众（Google/DeepMind/Anthropic） | 主流（广泛使用） |
| 大规模训练 | 更优（XLA、pmap、mesh） | 良好（FSDP、DeepSpeed） |
| 原型迭代速度 | 较慢（函数式开销） | 较快（修改后直接运行） |
| 生产推理 | TensorFlow Serving、Vertex AI | TorchServe、Triton、ONNX |
| 使用者 | DeepMind（Gemini）、Anthropic（Claude） | Meta（Llama）、OpenAI（GPT）、Stability AI |

坦率地说，除非有特定理由使用 JAX，否则用 PyTorch。这些理由包括：能使用 TPU、需要逐样本梯度、超大规模多设备训练，或者在 Google/DeepMind/Anthropic 工作。

### JAX 中的随机数（Random Numbers in JAX）

JAX 没有全局随机状态。每个随机操作都要求显式的伪随机数生成器键（PRNG Key）：

```python
key = jax.random.PRNGKey(42)
key1, key2 = jax.random.split(key)
w = jax.random.normal(key1, shape=(784, 256))
```

起初这很麻烦，但能保证跨设备、跨编译的可复现性，这是 PyTorch 的 `torch.manual_seed` 在多 GPU 场景中无法保证的。

```figure
batchnorm-effect
```

## 动手实现（Build It）

### 步骤 1：设置与数据（Step 1: Setup and Data）

我们使用 JAX 和 Optax 在 MNIST 上训练 3 层 MLP：784 个输入，两个隐藏层分别有 256、128 个神经元，10 个输出类别。

```python
import jax
import jax.numpy as jnp
from jax import random
import optax

def get_mnist_data():
    from sklearn.datasets import fetch_openml
    mnist = fetch_openml('mnist_784', version=1, as_frame=False, parser='auto')
    X = mnist.data.astype('float32') / 255.0
    y = mnist.target.astype('int')
    X_train, X_test = X[:60000], X[60000:]
    y_train, y_test = y[:60000], y[60000:]
    return X_train, y_train, X_test, y_test
```

### 步骤 2：初始化参数（Step 2: Initialize Parameters）

没有类，只有返回 Pytree 的函数：

```python
def init_params(key):
    k1, k2, k3 = random.split(key, 3)
    scale1 = jnp.sqrt(2.0 / 784)
    scale2 = jnp.sqrt(2.0 / 256)
    scale3 = jnp.sqrt(2.0 / 128)
    params = {
        'layer1': {
            'w': scale1 * random.normal(k1, (784, 256)),
            'b': jnp.zeros(256),
        },
        'layer2': {
            'w': scale2 * random.normal(k2, (256, 128)),
            'b': jnp.zeros(128),
        },
        'layer3': {
            'w': scale3 * random.normal(k3, (128, 10)),
            'b': jnp.zeros(10),
        },
    }
    return params
```

手动完成 He 初始化，从一个种子拆分出三个 PRNG 键。每个权重都是嵌套字典中的不可变数组。

### 步骤 3：前向传播（Step 3: Forward Pass）

```python
def forward(params, x):
    x = jnp.dot(x, params['layer1']['w']) + params['layer1']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer2']['w']) + params['layer2']['b']
    x = jax.nn.relu(x)
    x = jnp.dot(x, params['layer3']['w']) + params['layer3']['b']
    return x

def loss_fn(params, x, y):
    logits = forward(params, x)
    one_hot = jax.nn.one_hot(y, 10)
    return -jnp.mean(jnp.sum(jax.nn.log_softmax(logits) * one_hot, axis=-1))
```

纯函数，传入参数，返回预测。没有 `self`，不存储状态。`loss_fn` 从零计算交叉熵：Softmax、对数、负均值。

### 步骤 4：JIT 编译的训练步骤（Step 4: JIT-Compiled Training Step）

```python
@jax.jit
def train_step(params, opt_state, x, y):
    loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
    updates, opt_state = optimizer.update(grads, opt_state, params)
    params = optax.apply_updates(params, updates)
    return params, opt_state, loss

@jax.jit
def accuracy(params, x, y):
    logits = forward(params, x)
    preds = jnp.argmax(logits, axis=-1)
    return jnp.mean(preds == y)
```

`jax.value_and_grad` 一次返回损失值和梯度。`@jax.jit` 装饰器将两个函数编译到 XLA。首次调用后，每个训练步骤都无需经过 Python。

### 步骤 5：训练循环（Step 5: Training Loop）

```python
optimizer = optax.adam(learning_rate=1e-3)

X_train, y_train, X_test, y_test = get_mnist_data()
X_train, X_test = jnp.array(X_train), jnp.array(X_test)
y_train, y_test = jnp.array(y_train), jnp.array(y_test)

key = random.PRNGKey(0)
params = init_params(key)
opt_state = optimizer.init(params)

batch_size = 128
n_epochs = 10

for epoch in range(n_epochs):
    key, subkey = random.split(key)
    perm = random.permutation(subkey, len(X_train))
    X_shuffled = X_train[perm]
    y_shuffled = y_train[perm]

    epoch_loss = 0.0
    n_batches = len(X_train) // batch_size
    for i in range(n_batches):
        start = i * batch_size
        xb = X_shuffled[start:start + batch_size]
        yb = y_shuffled[start:start + batch_size]
        params, opt_state, loss = train_step(params, opt_state, xb, yb)
        epoch_loss += loss

    train_acc = accuracy(params, X_train[:5000], y_train[:5000])
    test_acc = accuracy(params, X_test, y_test)
    print(f"Epoch {epoch + 1:2d} | Loss: {epoch_loss / n_batches:.4f} | "
          f"Train Acc: {train_acc:.4f} | Test Acc: {test_acc:.4f}")
```

10 轮，测试准确率约 97%。第 1 轮因 JIT 编译较慢，第 2-10 轮很快。

注意没有什么：没有 `.zero_grad()`、`.backward()`、`.step()`。整个更新就是一次组合函数调用。计算梯度、经 Adam 变换、应用到参数，全部在 `train_step` 内完成。

## 实际应用（Use It）

### Flax：Google 的标准选择（Flax: The Google Standard）

Flax 是最常见的 JAX 神经网络库，重新加入 `nn.Module`，但显式管理状态：

```python
import flax.linen as nn

class MLP(nn.Module):
    @nn.compact
    def __call__(self, x):
        x = nn.Dense(256)(x)
        x = nn.relu(x)
        x = nn.Dense(128)(x)
        x = nn.relu(x)
        x = nn.Dense(10)(x)
        return x

model = MLP()
params = model.init(jax.random.PRNGKey(0), jnp.ones((1, 784)))
logits = model.apply(params, x_batch)
```

结构与 PyTorch 相同，但 `params` 独立于模型。`model.init()` 创建参数，`model.apply(params, x)` 运行前向传播，模型对象自身没有状态。

### Equinox：符合 Python 习惯的替代方案（Equinox: The Pythonic Alternative）

Equinox（Patrick Kidger 开发）用 Pytree 表示模型：

```python
import equinox as eqx

model = eqx.nn.MLP(
    in_size=784, out_size=10, width_size=256, depth=2,
    activation=jax.nn.relu, key=jax.random.PRNGKey(0)
)
logits = model(x)
```

模型本身就是 Pytree，不需要 `.apply()`。参数就是模型的叶子节点，更接近 JAX 的思考方式。

### Optax：可组合优化器（Optax: Composable Optimizers）

Optax 将梯度变换与更新解耦：

```python
schedule = optax.warmup_cosine_decay_schedule(
    init_value=0.0, peak_value=1e-3,
    warmup_steps=1000, decay_steps=50000
)

optimizer = optax.chain(
    optax.clip_by_global_norm(1.0),
    optax.adamw(learning_rate=schedule, weight_decay=0.01),
)
```

梯度裁剪、学习率预热、权重衰减都组合成变换链。每个变换读取梯度，修改它，再传给下一个变换。没有庞大的单体优化器类。

## 交付成果（Ship It）

**安装：**

```bash
pip install jax jaxlib optax flax
```

GPU 支持：

```bash
pip install jax[cuda12]
```

TPU 支持（Google Cloud）：

```bash
pip install jax[tpu] -f https://storage.googleapis.com/jax-releases/libtpu_releases.html
```

**性能注意事项：**

- 首次 JIT 调用因编译较慢，基准测试前先预热。
- 避免在 JIT 内用 Python 循环遍历 JAX 数组，使用 `jax.lax.scan` 或 `jax.lax.fori_loop`。
- `jax.debug.print()` 可在 JIT 内使用，普通 `print()` 不行。
- 使用 `jax.profiler` 或 TensorBoard 进行性能分析，XLA 编译可能掩盖瓶颈。
- JAX 默认预分配 75% GPU 内存，设置 `XLA_PYTHON_CLIENT_PREALLOCATE=false` 可关闭。

**检查点保存：**

```python
import orbax.checkpoint as ocp
checkpointer = ocp.PyTreeCheckpointer()
checkpointer.save('/tmp/model', params)
restored = checkpointer.restore('/tmp/model')
```

**本课产出：**
- `outputs/prompt-jax-optimizer.md`：选择合适 JAX 优化器配置的提示词
- `outputs/skill-jax-patterns.md`：介绍 JAX 函数式模式的技能文档

## 练习（Exercises）

1. 为 MLP 添加随机失活。JAX 的随机失活需要 PRNG 键，将键显式传过前向传播，并为每个失活层拆分。比较有无随机失活的测试准确率。

2. 用 `jax.vmap` 为一批 32 张 MNIST 图像计算逐样本梯度，再计算每个样本的梯度范数。哪些样本梯度最大，为什么？

3. 用适用于任意层数的通用 `mlp_forward(params, x)` 替代手写前向函数，使用 `jax.tree.leaves` 自动确定深度。

4. 对有无 `@jax.jit` 的训练步骤做基准测试，分别计时 100 步。在你的硬件上加速多少？首次调用的编译开销是多少？

5. 组合 `optax.chain(optax.clip_by_global_norm(1.0), optax.adam(1e-3))` 实现梯度裁剪，分别进行有无裁剪的训练。绘制训练期间梯度范数，观察效果。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 加速线性代数（XLA） | “让 JAX 变快的东西” | 融合操作、从计算图生成优化 GPU/TPU 内核的编译器 |
| 即时编译（JIT） | “运行时编译” | JAX 首次调用时追踪函数并编译到 XLA，后续调用运行编译版本 |
| 纯函数（Pure Function） | “没有副作用” | 输出仅取决于输入的函数，没有全局状态、修改操作，随机性需要显式键 |
| 向量化映射（vmap） | “自动分批” | 无需重写，将单样本处理函数变换为批处理函数 |
| 并行映射（pmap） | “自动并行” | 将函数复制到多设备并拆分输入批次 |
| 树结构（Pytree） | “数组的嵌套字典” | JAX 可遍历与变换的任意列表、元组、字典和数组嵌套结构 |
| 追踪（Tracing） | “记录计算” | JAX 用抽象值执行函数，构建计算图而不计算真实结果 |
| 函数式自动微分（Functional Autodiff） | “函数的 grad” | 通过变换函数求导，而非将梯度存储附加到张量 |
| Optax | “JAX 的优化器库” | 可串联组合的梯度变换库，包含 Adam、SGD、裁剪、调度 |
| Flax | “JAX 的 nn.Module” | Google 的 JAX 神经网络库，增加层抽象，同时保持显式状态 |

## 延伸阅读（Further Reading）

- JAX 文档：https://jax.readthedocs.io/ ，官方文档，包含优秀的 grad、jit、vmap 教程
- 《JAX：Python+NumPy 程序的可组合变换（JAX: composable transformations of Python+NumPy programs）》（Bradbury 等，2018）：解释设计理念的原始论文
- Flax 文档：https://flax.readthedocs.io/ ，Google 的 JAX 神经网络库
- Patrick Kidger，《Equinox：通过可调用 Pytree 与过滤变换构建 JAX 神经网络（Equinox: neural networks in JAX via callable PyTrees and filtered transformations）》（2021）：符合 Python 习惯的 Flax 替代方案
- DeepMind，《Optax：可组合梯度变换与优化（Optax: composable gradient transformation and optimisation）》：标准优化器库
- 《你不了解 JAX（You Don't Know JAX）》（Colin Raffel，2020）：T5 作者之一撰写的 JAX 陷阱与模式实践指南
