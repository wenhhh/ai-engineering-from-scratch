# 向量、矩阵与运算（Vectors, Matrices & Operations）

> 神经网络的核心是矩阵乘法，再加上一些其他步骤。

**Type:** Build
**Languages:** Python, Julia
**Prerequisites:** 阶段 1，第 01 课（线性代数直觉）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 构建 Matrix 类，支持逐元素运算（Element-wise operation）、矩阵乘法、转置、行列式和逆矩阵
- 区分逐元素乘法与矩阵乘法，并解释各自的适用场景
- 仅使用从零实现的 Matrix 类，构建一个全连接神经网络层（Dense layer），即 `relu(W @ x + b)`
- 解释广播（Broadcasting）规则，以及神经网络框架如何完成偏置加法

## 问题（The Problem）

你想构建一个神经网络，阅读代码时看到了这一行：

```text
output = activation(weights @ input + bias)
```

其中 `@` 表示矩阵乘法，`weights` 是矩阵，`input` 是向量。如果不理解这些运算，这行代码就像魔法；理解之后就会发现，它用三步运算完成了一层网络的整个前向传播（Forward pass）。

模型处理的每张图像都是像素值矩阵，每个词嵌入（Word embedding）都是向量，每一层神经网络都涉及矩阵变换。不熟悉矩阵运算就无法构建 AI 系统，就像不理解变量就无法编程一样。

本课将通过从零实现，帮助你熟练掌握这些运算。

## 核心概念（The Concept）

### 向量：有序数字列表（Vectors: ordered lists of numbers）

向量（Vector）是一列有序数字，具有方向和模长（Magnitude）。在 AI 中，向量表示数据点、特征或参数。

```text
v = [3, 4]        -- 二维向量
w = [1, 0, -2]    -- 三维向量
```

二维向量 `[3, 4]` 指向平面上的坐标 (3, 4)。它的长度，也就是模长，为 5，对应 3-4-5 直角三角形。

### 矩阵：二维数字网格（Matrices: grids of numbers）

矩阵（Matrix）是由行和列组成的二维网格。m x n 矩阵有 m 行、n 列。

```text
A = | 1  2  3 |     -- 2x3 矩阵，2 行 3 列
    | 4  5  6 |
```

在神经网络中，权重矩阵将输入向量变换为输出向量。一个有 784 个输入、128 个输出的网络层，使用 128x784 的权重矩阵。

### 为什么形状很重要（Why shapes matter）

矩阵乘法有严格规则：`(m x n) @ (n x p) = (m x p)`，内侧维度必须匹配。

```text
(128 x 784) @ (784 x 1) = (128 x 1)
  权重          输入        输出

内侧维度： 784 = 784  -- 合法
```

PyTorch 报出形状不匹配错误时，通常就与这一规则有关。

### 运算速览（The operations map）

| 运算 | 作用 | 神经网络中的用途 |
|-----------|-------------|-------------------|
| 加法（Addition） | 逐元素相加 | 为输出添加偏置（Bias） |
| 标量乘法（Scalar multiply） | 缩放每个元素 | 学习率乘以梯度 |
| 矩阵乘法（Matrix multiply） | 变换向量 | 网络层前向传播 |
| 转置（Transpose） | 交换行与列 | 反向传播（Backpropagation） |
| 行列式（Determinant） | 用一个数概括矩阵的性质 | 检查可逆性（Invertibility） |
| 逆矩阵（Inverse） | 撤销变换 | 求解线性方程组 |
| 单位矩阵（Identity） | 不改变输入的矩阵 | 初始化、残差连接（Residual connection） |

### 逐元素乘法与矩阵乘法（Element-wise vs matrix multiplication）

初学者经常混淆这两种运算。

逐元素乘法：将对应位置的元素相乘，两个矩阵必须形状相同。

```text
| 1  2 |   | 5  6 |   | 5  12 |
| 3  4 | * | 7  8 | = | 21 32 |
```

矩阵乘法：计算行与列的点积（Dot product），内侧维度必须匹配。

```text
| 1  2 |   | 5  6 |   | 1*5+2*7  1*6+2*8 |   | 19  22 |
| 3  4 | @ | 7  8 | = | 3*5+4*7  3*6+4*8 | = | 43  50 |
```

两者是不同的运算，结果不同，规则也不同。

### 广播（Broadcasting）

把偏置向量加到输出矩阵上时，两者的形状并不相同。广播会扩展较小的数组，使其能够匹配。

```text
| 1  2  3 |   +   [10, 20, 30]
| 4  5  6 |

广播将该向量扩展到各行：

| 1  2  3 |   | 10  20  30 |   | 11  22  33 |
| 4  5  6 | + | 10  20  30 | = | 14  25  36 |
```

现代框架都会自动完成这一操作。理解广播后，面对“形状看似不匹配，代码却能运行”的情况，就不会困惑。

```figure
vector-projection
```

## 动手实现（Build It）

### 步骤 1：向量类（Vector class）

```python
class Vector:
    def __init__(self, data):
        self.data = list(data)
        self.size = len(self.data)

    def __repr__(self):
        return f"Vector({self.data})"

    def __add__(self, other):
        return Vector([a + b for a, b in zip(self.data, other.data)])

    def __sub__(self, other):
        return Vector([a - b for a, b in zip(self.data, other.data)])

    def __mul__(self, scalar):
        return Vector([x * scalar for x in self.data])

    def dot(self, other):
        return sum(a * b for a, b in zip(self.data, other.data))

    def magnitude(self):
        return sum(x ** 2 for x in self.data) ** 0.5
```

### 步骤 2：支持核心运算的矩阵类（Matrix class with core operations）

```python
class Matrix:
    def __init__(self, data):
        self.data = [list(row) for row in data]
        self.rows = len(self.data)
        self.cols = len(self.data[0])
        self.shape = (self.rows, self.cols)

    def __repr__(self):
        rows_str = "\n  ".join(str(row) for row in self.data)
        return f"Matrix({self.shape}):\n  {rows_str}"

    def __add__(self, other):
        return Matrix([
            [self.data[i][j] + other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def __sub__(self, other):
        return Matrix([
            [self.data[i][j] - other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def scalar_multiply(self, scalar):
        return Matrix([
            [self.data[i][j] * scalar for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def element_wise_multiply(self, other):
        return Matrix([
            [self.data[i][j] * other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def matmul(self, other):
        return Matrix([
            [
                sum(self.data[i][k] * other.data[k][j] for k in range(self.cols))
                for j in range(other.cols)
            ]
            for i in range(self.rows)
        ])

    def transpose(self):
        return Matrix([
            [self.data[j][i] for j in range(self.rows)]
            for i in range(self.cols)
        ])

    def determinant(self):
        if self.shape == (1, 1):
            return self.data[0][0]
        if self.shape == (2, 2):
            return self.data[0][0] * self.data[1][1] - self.data[0][1] * self.data[1][0]
        det = 0
        for j in range(self.cols):
            minor = Matrix([
                [self.data[i][k] for k in range(self.cols) if k != j]
                for i in range(1, self.rows)
            ])
            det += ((-1) ** j) * self.data[0][j] * minor.determinant()
        return det

    def inverse_2x2(self):
        det = self.determinant()
        if det == 0:
            raise ValueError("Matrix is singular, no inverse exists")
        return Matrix([
            [self.data[1][1] / det, -self.data[0][1] / det],
            [-self.data[1][0] / det, self.data[0][0] / det]
        ])

    @staticmethod
    def identity(n):
        return Matrix([
            [1 if i == j else 0 for j in range(n)]
            for i in range(n)
        ])
```

### 步骤 3：运行验证（See it work）

```python
A = Matrix([[1, 2], [3, 4]])
B = Matrix([[5, 6], [7, 8]])

print("A + B =", (A + B).data)
print("A @ B =", A.matmul(B).data)
print("A^T =", A.transpose().data)
print("det(A) =", A.determinant())
print("A^-1 =", A.inverse_2x2().data)

I = Matrix.identity(2)
print("A @ A^-1 =", A.matmul(A.inverse_2x2()).data)
```

### 步骤 4：连接到神经网络（Connect to neural networks）

```python
import random

inputs = Matrix([[0.5], [0.8], [0.2]])
weights = Matrix([
    [random.uniform(-1, 1) for _ in range(3)]
    for _ in range(2)
])
bias = Matrix([[0.1], [0.1]])

def relu_matrix(m):
    return Matrix([[max(0, val) for val in row] for row in m.data])

pre_activation = weights.matmul(inputs) + bias
output = relu_matrix(pre_activation)

print(f"Input shape: {inputs.shape}")
print(f"Weight shape: {weights.shape}")
print(f"Output shape: {output.shape}")
print(f"Output: {output.data}")
```

这就是一个全连接层：`output = relu(W @ x + b)`。神经网络中的每个全连接层都执行这类计算。

## 实际应用（Use It）

NumPy 用更少的代码完成上方所有操作，速度也能提升多个数量级。

```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

print("A + B =\n", A + B)
print("A * B (element-wise) =\n", A * B)
print("A @ B (matrix multiply) =\n", A @ B)
print("A^T =\n", A.T)
print("det(A) =", np.linalg.det(A))
print("A^-1 =\n", np.linalg.inv(A))
print("I =\n", np.eye(2))

inputs = np.random.randn(3, 1)
weights = np.random.randn(2, 3)
bias = np.array([[0.1], [0.1]])
output = np.maximum(0, weights @ inputs + bias)

print(f"\nNeural network layer: {weights.shape} @ {inputs.shape} = {output.shape}")
print(f"Output:\n{output}")
```

Python 的 `@` 运算符调用 `__matmul__`。NumPy 通过用 C 和 Fortran 编写、经过优化的基础线性代数子程序（BLAS）实现它。数学计算相同，速度可以快 100 倍。

NumPy 中的广播：

```python
matrix = np.array([[1, 2, 3], [4, 5, 6]])
bias = np.array([10, 20, 30])
print(matrix + bias)
```

NumPy 自动将一维偏置广播到两行。这就是神经网络框架实现偏置加法的方式。

## 交付成果（Ship It）

本课产出一个提示词，通过几何直觉讲授矩阵运算，见 `outputs/prompt-matrix-operations.md`。

这里构建的 Matrix 类，将成为阶段 3 第 10 课中迷你神经网络框架的基础。

## 练习（Exercises）

1. **验证逆矩阵。** 计算 `A @ A.inverse_2x2()`，确认得到单位矩阵。使用三个不同的 2x2 矩阵尝试。行列式为零时会发生什么？

2. **实现 3x3 逆矩阵。** 扩展 Matrix 类，使用伴随矩阵法（Adjugate method）计算 3x3 矩阵的逆，并与 NumPy 的 `np.linalg.inv` 对比测试。

3. **构建两层网络。** 只用自己的 Matrix 类，不使用 NumPy，创建两层神经网络：输入 (3) -> 隐藏层 (4) -> 输出 (2)。随机初始化权重，执行一次前向传播，并验证所有形状。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 准确含义 |
|------|----------------|----------------------|
| 向量（Vector） | “一支箭头” | 一列有序数字；在 AI 中表示高维空间中的一个点。 |
| 矩阵（Matrix） | “一张数字表” | 一种线性变换，将向量从一个空间映射到另一个空间。 |
| 矩阵乘法（Matrix multiply） | “把数字乘起来” | 第一个矩阵的每一行与第二个矩阵的每一列分别求点积，顺序不能随意交换。 |
| 转置（Transpose） | “翻过来” | 交换行和列，将 m x n 矩阵变为 n x m，在反向传播中不可或缺。 |
| 行列式（Determinant） | “从矩阵算出的某个数” | 衡量矩阵对二维面积或三维体积的缩放程度。为零意味着变换压缩掉了一个维度。 |
| 逆矩阵（Inverse） | “撤销矩阵操作” | 逆转原变换的矩阵，只在行列式非零时存在。 |
| 单位矩阵（Identity matrix） | “没什么作用的矩阵” | 相当于数字运算中的乘以 1，用于残差网络（ResNet）的残差连接。 |
| 广播（Broadcasting） | “自动修复形状的魔法” | 沿缺失维度重复较小数组，使其形状能够匹配较大数组。 |
| 逐元素（Element-wise） | “普通乘法” | 对应位置相乘，两个数组必须形状相同或可以广播。 |

## 延伸阅读（Further Reading）

- [3Blue1Brown：线性代数的本质（Essence of Linear Algebra）](https://www.3blue1brown.com/topics/linear-algebra)：本课各项运算的视觉直觉
- [NumPy 广播文档（Broadcasting）](https://numpy.org/doc/stable/user/basics.broadcasting.html)：NumPy 遵循的精确规则
- [斯坦福 CS229 线性代数复习资料（Linear Algebra Review）](http://cs229.stanford.edu/section/cs229-linalg.pdf)：面向机器学习线性代数的简明参考
