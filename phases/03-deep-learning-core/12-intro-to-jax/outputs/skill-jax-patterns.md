---
name: skill-jax-patterns
description: JAX 函数式编程模式，说明何时及如何使用 grad、jit、vmap 和 pmap
version: 1.0.0
phase: 3
lesson: 12
tags: [jax, functional-programming, autodiff, compilation, vectorization]
---

# JAX 函数式模式（JAX Functional Patterns）

JAX 变换纯函数（Pure Function）。下面每个模式都遵循同一规则：编写接收输入、返回输出且无副作用的函数，再对它进行变换。

## 四种变换（The Four Transforms）

### grad：对函数求导（Differentiate a function）

```python
grads = jax.grad(loss_fn)(params, x, y)
loss, grads = jax.value_and_grad(loss_fn)(params, x, y)
```

适用场景：优化需要梯度。
约束：函数必须返回标量。非标量输出使用 `jax.jacobian`。

### jit：编译函数（Compile a function）

```python
fast_fn = jax.jit(f)
```

适用场景：函数将以相同形状的输入调用超过一次。
约束：不能使用依赖追踪值的 Python 控制流。条件判断使用 `jax.lax.cond`，循环使用 `jax.lax.scan`。

### vmap：向量化函数（Vectorize a function）

```python
batch_fn = jax.vmap(f, in_axes=(None, 0))
```

适用场景：已编写单样本函数，需要它支持批次。
`in_axes` 指定沿参数的哪个轴进行批处理，`None` 表示不批处理，而是广播。

### pmap：跨设备并行（Parallelize across devices）

```python
parallel_fn = jax.pmap(f, axis_name='devices')
```

适用场景：拥有多个 GPU/TPU，希望进行数据并行（Data Parallelism）。
函数内用 `jax.lax.pmean(x, 'devices')` 跨设备求平均。

## 组合规则（Composition Rules）

变换可以组合，顺序很重要：

```python
per_example_grads = jax.jit(jax.vmap(jax.grad(loss_fn), in_axes=(None, 0, 0)))
```

从右向左阅读：对 loss_fn 求梯度，沿样本向量化，再编译结果。

有效组合：
- `jit(grad(f))`：编译后的梯度计算
- `jit(vmap(f))`：编译后的批处理计算
- `vmap(grad(f))`：逐样本梯度
- `pmap(jit(f))`：并行的编译后计算
- `grad(jit(f))`：编译函数的梯度，与 jit(grad(f)) 相同

## 参数管理模式（Parameter Management Pattern）

JAX 参数是树结构（Pytree），即数组的嵌套字典：

```python
params = {
    'layer1': {'w': jnp.zeros((784, 256)), 'b': jnp.zeros(256)},
    'layer2': {'w': jnp.zeros((256, 10)),  'b': jnp.zeros(10)},
}
```

一次更新全部参数：
```python
params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
```

统计参数量：
```python
n_params = sum(p.size for p in jax.tree.leaves(params))
```

## PRNG 键管理（PRNG Key Management）

JAX 要求显式随机键：

```python
key = jax.random.PRNGKey(0)
key, subkey = jax.random.split(key)
noise = jax.random.normal(subkey, shape)
```

多个随机操作需要一次拆分：
```python
keys = jax.random.split(key, n)
```

不要复用键，使用前始终拆分。

## 常见错误（Common Mistakes）

1. **在 jit 内修改数组**：JAX 数组不可变。用 `x.at[i].set(v)` 替代 `x[i] = v`。

2. **在 jit 内使用 Python print**：`print` 在追踪时而非执行时运行。使用 `jax.debug.print("{}", x)`。

3. **在 jit 内对追踪值使用 Python if/for**：使用 `jax.lax.cond`、`jax.lax.switch`、`jax.lax.scan`、`jax.lax.fori_loop`。

4. **忘记 `.block_until_ready()`**：JAX 使用异步派发（Async Dispatch）。基准测试时调用 `.block_until_ready()`，等待实际完成。

5. **复用 PRNG 键**：同一个键的两次操作会产生相同“随机”值，始终拆分。

6. **JIT 函数中的全局状态**：全局变量在追踪时被捕获，之后的修改不可见。所有内容都通过参数传入。

## 决策检查清单（Decision Checklist）

1. 函数调用超过一次吗？添加 `@jax.jit`。
2. 需要梯度吗？使用 `jax.grad` 或 `jax.value_and_grad` 包装。
3. 函数处理单样本，但你有一个批次吗？用 `jax.vmap` 包装。
4. 有多个设备吗？用 `jax.pmap` 包装。
5. 使用随机性吗？显式传递 PRNG 键。
6. 对数组值使用 Python 控制流吗？替换为 `jax.lax` 基础操作。

## 何时使用 JAX（When to Use JAX）

以下情况使用 JAX：
- 需要逐样本梯度（差分隐私，Differential Privacy；Fisher 信息）
- 在 TPU 上训练，JAX 是原生框架
- 需要高阶导数（Hessian、Jacobian）
- 希望将整个训练步骤编译为单个内核
- 团队位于 Google DeepMind 或 Anthropic

以下情况使用 PyTorch：
- 希望使用最大的生态（HuggingFace、torchvision、Lightning）
- 相比纯速度，更重视调试便利
- 使用 TorchServe/Triton 部署到 NVIDIA GPU
- 需要招聘，PyTorch 开发者更多
- 希望快速迭代新架构
