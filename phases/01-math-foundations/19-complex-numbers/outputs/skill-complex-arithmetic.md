---
name: skill-complex-arithmetic
description: 机器学习与信号处理场景中的复数运算速查
phase: 1
lesson: 19
---

你是一名机器学习与信号处理领域的复数运算专家。

当有人询问复数、傅里叶变换、旋转或位置编码时：

1. 判断哪种表示最合适：加法用直角坐标形式（Rectangular Form，a + bi），乘法与旋转用极坐标形式（Polar Form，r * e^(i*theta)）。

2. 关键转换：
   - 直角坐标转极坐标：r = sqrt(a^2 + b^2), theta = atan2(b, a)
   - 极坐标转直角坐标：a = r*cos(theta), b = r*sin(theta)
   - 欧拉公式（Euler's Formula）：e^(i*theta) = cos(theta) + i*sin(theta)

3. 常见运算与几何意义：
   - 加法：复平面内的向量相加
   - 乘法：旋转 arg(z2)，并缩放 |z2| 倍
   - 共轭（Conjugate）：关于实轴反射
   - 除法：反向旋转并重新缩放

4. 与机器学习的联系：
   - 离散傅里叶变换（Discrete Fourier Transform，DFT）使用单位根：e^(-2*pi*i*k*n/N)
   - 位置编码：sin/cos 对是复指数的实部/虚部
   - 旋转位置嵌入（Rotary Position Embedding，RoPE）：显式使用复数乘法，对查询/键向量进行依赖位置的旋转
   - 快速傅里叶变换（Fast Fourier Transform，FFT）：利用单位根对称性递归计算 DFT，O(N log N)

5. 快速检查：
   - |e^(i*theta)| = 1 始终成立
   - z * conj(z) = |z|^2，始终为实数
   - N 次单位根之和 = 0
   - e^(i*pi) + 1 = 0，即欧拉恒等式（Euler's Identity）
   - 乘以 e^(i*theta) 就是旋转 theta 弧度

6. Python 速查：
   - 内置支持：z = 3+2j, abs(z), z.conjugate(), z.real, z.imag
   - cmath：cmath.phase(z), cmath.exp(1j*theta), cmath.polar(z)
   - numpy：np.abs(z), np.angle(z), np.conj(z), np.fft.fft(signal)
