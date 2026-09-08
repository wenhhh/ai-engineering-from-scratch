import math
import os


class Complex:
    def __init__(self, real, imag=0.0):
        self.real = float(real)
        self.imag = float(imag)

    def __add__(self, other):
        if isinstance(other, (int, float)):
            other = Complex(other)
        return Complex(self.real + other.real, self.imag + other.imag)

    def __radd__(self, other):
        return self.__add__(Complex(other))

    def __sub__(self, other):
        if isinstance(other, (int, float)):
            other = Complex(other)
        return Complex(self.real - other.real, self.imag - other.imag)

    def __rsub__(self, other):
        return Complex(other - self.real, -self.imag)

    def __mul__(self, other):
        if isinstance(other, (int, float)):
            other = Complex(other)
        r = self.real * other.real - self.imag * other.imag
        i = self.real * other.imag + self.imag * other.real
        return Complex(r, i)

    def __rmul__(self, other):
        return self.__mul__(Complex(other))

    def __truediv__(self, other):
        if isinstance(other, (int, float)):
            other = Complex(other)
        denom = other.real ** 2 + other.imag ** 2
        if denom == 0:
            raise ZeroDivisionError("不能除以零复数（Complex number）")
        r = (self.real * other.real + self.imag * other.imag) / denom
        i = (self.imag * other.real - self.real * other.imag) / denom
        return Complex(r, i)

    def __neg__(self):
        return Complex(-self.real, -self.imag)

    def magnitude(self):
        return math.sqrt(self.real ** 2 + self.imag ** 2)

    def phase(self):
        return math.atan2(self.imag, self.real)

    def conjugate(self):
        return Complex(self.real, -self.imag)

    def __repr__(self):
        if abs(self.imag) < 1e-12:
            return f"{self.real:.6f}"
        sign = "+" if self.imag >= 0 else "-"
        return f"{self.real:.6f} {sign} {abs(self.imag):.6f}i"

    def __eq__(self, other):
        if isinstance(other, (int, float)):
            other = Complex(other)
        return (abs(self.real - other.real) < 1e-10 and
                abs(self.imag - other.imag) < 1e-10)


def to_polar(z):
    return z.magnitude(), z.phase()


def from_polar(r, theta):
    return Complex(r * math.cos(theta), r * math.sin(theta))


def euler(theta):
    return Complex(math.cos(theta), math.sin(theta))


def dft(signal):
    N = len(signal)
    result = []
    for k in range(N):
        total = Complex(0, 0)
        for n in range(N):
            angle = -2 * math.pi * k * n / N
            xn = signal[n] if isinstance(signal[n], Complex) else Complex(signal[n])
            total = total + xn * euler(angle)
        result.append(total)
    return result


def idft(spectrum):
    N = len(spectrum)
    result = []
    for n in range(N):
        total = Complex(0, 0)
        for k in range(N):
            angle = 2 * math.pi * k * n / N
            total = total + spectrum[k] * euler(angle)
        result.append(Complex(total.real / N, total.imag / N))
    return result


def roots_of_unity(N):
    return [euler(2 * math.pi * k / N) for k in range(N)]


def demo_arithmetic():
    print("=" * 65)
    print("  复数运算（Complex Arithmetic）")
    print("=" * 65)
    print()

    z1 = Complex(3, 2)
    z2 = Complex(1, 4)

    print(f"  z1 = {z1}")
    print(f"  z2 = {z2}")
    print()

    print(f"  z1 + z2  = {z1 + z2}")
    print(f"  z1 - z2  = {z1 - z2}")
    print(f"  z1 * z2  = {z1 * z2}")
    print(f"  z1 / z2  = {z1 / z2}")
    print()

    print(f"  |z1|     = {z1.magnitude():.6f}")
    print(f"  phase(z1)= {z1.phase():.6f} rad ({math.degrees(z1.phase()):.2f} deg)")
    print(f"  conj(z1) = {z1.conjugate()}")
    print()

    product = z1 * z1.conjugate()
    expected = z1.real ** 2 + z1.imag ** 2
    print(f"  z1 * conj(z1) = {product}")
    print(f"  a^2 + b^2     = {expected:.6f}")
    print(f"  一致： {abs(product.real - expected) < 1e-10}")
    print()

    z3 = Complex(5, 2)
    z4 = Complex(1, -3)
    quotient = z3 / z4
    reconstructed = quotient * z4
    print(f"  除法验证（Division check）： (5+2i) / (1-3i) = {quotient}")
    print(f"  重构（Reconstruct）：    result * (1-3i)  = {reconstructed}")
    print(f"  与原值一致： {abs(reconstructed.real - 5) < 1e-10 and abs(reconstructed.imag - 2) < 1e-10}")


def demo_polar_conversion():
    print()
    print()
    print("=" * 65)
    print("  极坐标形式与转换（Polar Form and Conversion）")
    print("=" * 65)
    print()

    test_cases = [
        Complex(1, 0),
        Complex(0, 1),
        Complex(-1, 0),
        Complex(0, -1),
        Complex(3, 4),
        Complex(-2, 3),
    ]

    print(f"  {'直角坐标形式（Rectangular）':<25s} {'r':>8s}  {'theta (deg)':>12s}  {'重构结果（Reconstructed）':<25s}")
    print(f"  {'-' * 25} {'-' * 8}  {'-' * 12}  {'-' * 25}")

    for z in test_cases:
        r, theta = to_polar(z)
        z_back = from_polar(r, theta)
        print(f"  {str(z):<25s} {r:>8.4f}  {math.degrees(theta):>12.2f}  {str(z_back):<25s}")


def demo_euler_formula():
    print()
    print()
    print("=" * 65)
    print("  欧拉公式（Euler's Formula）： e^(i*theta) = cos(theta) + i*sin(theta)")
    print("=" * 65)
    print()

    angles = [0, math.pi / 6, math.pi / 4, math.pi / 3, math.pi / 2,
              math.pi, 3 * math.pi / 2, 2 * math.pi]
    labels = ["0", "pi/6", "pi/4", "pi/3", "pi/2", "pi", "3pi/2", "2pi"]

    print(f"  {'theta':<8s} {'cos(theta)':>12s} {'sin(theta)':>12s} "
          f"{'e^(i*theta)':>25s} {'|e^(i*theta)|':>14s}")
    print(f"  {'-' * 8} {'-' * 12} {'-' * 12} {'-' * 25} {'-' * 14}")

    for label, theta in zip(labels, angles):
        e = euler(theta)
        print(f"  {label:<8s} {math.cos(theta):>12.6f} {math.sin(theta):>12.6f} "
              f"  {str(e):>23s} {e.magnitude():>14.10f}")

    print()
    e_pi = euler(math.pi)
    result = e_pi + Complex(1, 0)
    print(f"  欧拉恒等式（Euler's identity）： e^(i*pi) + 1 = {result}")
    print(f"  |e^(i*pi) + 1| = {result.magnitude():.2e} （应约为 0）")


def demo_rotation():
    print()
    print()
    print("=" * 65)
    print("  通过复数乘法实现旋转（Rotation via Complex Multiplication）")
    print("=" * 65)
    print()

    point = Complex(3, 4)
    print(f"  原始点（Original point）： {point}")
    print(f"  模（Magnitude）： {point.magnitude():.4f}")
    print(f"  辐角（Phase）： {math.degrees(point.phase()):.2f} deg")
    print()

    rotation_angles = [45, 90, 180, 270, 360]

    print(f"  {'旋转（Rotation）':<12s} {'结果（Result）':<30s} {'模（Magnitude）':>10s} {'辐角（Phase，deg）':>12s}")
    print(f"  {'-' * 12} {'-' * 30} {'-' * 10} {'-' * 12}")

    for deg in rotation_angles:
        rad = math.radians(deg)
        rotated = point * euler(rad)
        r, theta = to_polar(rotated)
        print(f"  {deg:>3d} deg     {str(rotated):<30s} {r:>10.4f} {math.degrees(theta):>12.2f}")

    print()
    print("  所有旋转都保持模（Magnitude）不变。")
    print("  旋转 360 度后回到原始点。")
    print()

    print("  旋转矩阵等价性验证（Rotation matrix equivalence check）：")
    print()

    test_angles = [math.pi / 6, math.pi / 4, math.pi / 3, math.pi / 2, math.pi]
    test_points = [Complex(1, 0), Complex(3, 4), Complex(-2, 5)]

    max_error = 0.0
    for theta in test_angles:
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        for p in test_points:
            complex_result = p * euler(theta)
            matrix_x = cos_t * p.real - sin_t * p.imag
            matrix_y = sin_t * p.real + cos_t * p.imag

            err = math.sqrt((complex_result.real - matrix_x) ** 2 +
                            (complex_result.imag - matrix_y) ** 2)
            max_error = max(max_error, err)

    print(f"  复数乘法与")
    print(f"  旋转矩阵之间的最大差异： {max_error:.2e}")


def demo_roots_of_unity():
    print()
    print()
    print("=" * 65)
    print("  单位根（Roots of Unity）")
    print("=" * 65)
    print()

    for N in [4, 8]:
        roots = roots_of_unity(N)
        print(f"  {N} 次单位根（Roots of unity）：")
        print(f"  {'k':<4s} {'根（Root）':<30s} {'|root|':>8s}")
        print(f"  {'-' * 4} {'-' * 30} {'-' * 8}")

        total = Complex(0, 0)
        for k, root in enumerate(roots):
            total = total + root
            print(f"  {k:<4d} {str(root):<30s} {root.magnitude():>8.6f}")

        print(f"  所有根的和： {total}")
        print(f"  |sum| = {total.magnitude():.2e} （应约为 0）")
        print()

    print("  单位根之和总为零。")
    print("  每个根的模恰好为 1。")


def demo_dft():
    print()
    print()
    print("=" * 65)
    print("  简单信号的离散傅里叶变换（DFT）")
    print("=" * 65)
    print()

    N = 32
    freq1 = 3
    freq2 = 7
    amp1 = 1.0
    amp2 = 0.5

    signal = []
    for n in range(N):
        t = n / N
        val = amp1 * math.sin(2 * math.pi * freq1 * t) + amp2 * math.sin(2 * math.pi * freq2 * t)
        signal.append(val)

    print(f"  信号（Signal）： {amp1}*sin(2*pi*{freq1}*t) + {amp2}*sin(2*pi*{freq2}*t)")
    print(f"  {N} 个样本")
    print()

    spectrum = dft(signal)

    print(f"  {'频点（Freq bin）':<10s} {'|X[k]|':>10s} {'辐角（Phase，deg）':>12s}")
    print(f"  {'-' * 10} {'-' * 10} {'-' * 12}")

    for k in range(N // 2 + 1):
        mag = spectrum[k].magnitude()
        if mag > 0.01:
            phase_deg = math.degrees(spectrum[k].phase())
            print(f"  k={k:<6d} {mag:>10.4f} {phase_deg:>12.2f}")

    print()
    print(f"  预期峰值位于 k={freq1}（幅度 {amp1 * N / 2:.1f}）")
    print(f"  以及 k={freq2}（幅度 {amp2 * N / 2:.1f}）")
    print()

    reconstructed = idft(spectrum)
    max_err = max(abs(reconstructed[n].real - signal[n]) for n in range(N))
    print(f"  逆离散傅里叶变换（IDFT）的重构误差： {max_err:.2e}")
    print(f"  完美重构（Perfect reconstruction）： {max_err < 1e-10}")


def demo_phasor():
    print()
    print()
    print("=" * 65)
    print("  相量（Phasors）：将旋转复数作为信号")
    print("=" * 65)
    print()

    omega = 2 * math.pi * 3
    N = 16

    print(f"  相量（Phasor）：e^(i*{3}*2*pi*t)，在 {N} 个点上采样")
    print()
    print(f"  {'t':>6s} {'实部（Real，cos）':>12s} {'虚部（Imag，sin）':>12s} {'模（Magnitude）':>10s}")
    print(f"  {'-' * 6} {'-' * 12} {'-' * 12} {'-' * 10}")

    for n in range(N):
        t = n / N
        phasor = euler(omega * t)
        print(f"  {t:>6.3f} {phasor.real:>12.6f} {phasor.imag:>12.6f} {phasor.magnitude():>10.6f}")

    print()
    print("  实部（Real part）描绘 cos(6*pi*t)。")
    print("  虚部（Imaginary part）描绘 sin(6*pi*t)。")
    print("  模始终为 1，相量保持在单位圆上。")


def demo_positional_encoding():
    print()
    print()
    print("=" * 65)
    print("  Transformer 位置编码频率（Positional Encoding Frequencies）")
    print("=" * 65)
    print()

    d_model = 8
    max_pos = 10

    print(f"  d_model = {d_model}, 显示前 {max_pos} 个位置")
    print()
    print(f"  频率（Frequencies，1/10000^(2i/d)）：")
    freqs = []
    for i in range(d_model // 2):
        freq = 1.0 / (10000 ** (2 * i / d_model))
        freqs.append(freq)
        print(f"    第 {i} 对维度： freq = {freq:.6f}")

    print()
    print(f"  位置编码（PE）矩阵（每个位置的一对 sin/cos 值）：")
    print()

    header = "  pos"
    for i in range(d_model // 2):
        header += f"  sin_{i:d}     cos_{i:d}  "
    print(header)
    print(f"  {'-' * (5 + d_model // 2 * 20)}")

    for pos in range(max_pos):
        line = f"  {pos:>3d}"
        for i in range(d_model // 2):
            angle = pos * freqs[i]
            line += f"  {math.sin(angle):>7.4f}  {math.cos(angle):>7.4f}"
        print(line)

    print()
    print("  每对 (sin, cos) 都是")
    print("  e^(i * pos * freq) 的实部和虚部。不同频率使每个")
    print("  位置在复平面上具有独特的“指纹”。")


def write_skill_output():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "outputs", "skill-complex-arithmetic.md")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        with open(output_path, "w") as f:
            f.write("---\n")
            f.write("name: skill-complex-arithmetic\n")
            f.write("description: 机器学习（ML）与信号处理场景中的复数运算速查\n")
            f.write("phase: 1\n")
            f.write("lesson: 19\n")
            f.write("---\n\n")
            f.write("你是机器学习与信号处理领域的复数运算专家。\n\n")
            f.write("当有人询问复数（Complex numbers）、傅里叶变换（Fourier transforms）、旋转或位置编码（Positional encodings）时：\n\n")
            f.write("1. 确定最适合的表示方式：加法使用直角坐标形式（Rectangular，a + bi），乘法与旋转使用极坐标形式（Polar，r * e^(i*theta)）。\n\n")
            f.write("2. 关键转换：\n")
            f.write("   - 直角坐标转极坐标： r = sqrt(a^2 + b^2), theta = atan2(b, a)\n")
            f.write("   - 极坐标转直角坐标： a = r*cos(theta), b = r*sin(theta)\n")
            f.write("   - 欧拉公式（Euler's formula）： e^(i*theta) = cos(theta) + i*sin(theta)\n\n")
            f.write("3. 常见运算及其几何意义：\n")
            f.write("   - 加法（Addition）：复平面上的向量加法\n")
            f.write("   - 乘法（Multiplication）：旋转 arg(z2) 并按 |z2| 缩放\n")
            f.write("   - 共轭（Conjugate）：关于实轴反射\n")
            f.write("   - 除法（Division）：反向旋转并重新缩放\n\n")
            f.write("4. 与机器学习（ML）的联系：\n")
            f.write("   - 离散傅里叶变换（DFT）使用单位根： e^(-2*pi*i*k*n/N)\n")
            f.write("   - 位置编码（Positional encodings）：sin/cos 对是复指数的实部/虚部\n")
            f.write("   - 旋转位置编码（RoPE）：通过显式复数乘法，根据位置旋转查询/键向量（Query/key vectors）\n")
            f.write("   - 快速傅里叶变换（FFT）：利用单位根的对称性递归计算 DFT，复杂度为 O(N log N)\n\n")
            f.write("5. 快速检查：\n")
            f.write("   - |e^(i*theta)| = 1 始终成立\n")
            f.write("   - z * conj(z) = |z|^2 （始终为实数）\n")
            f.write("   - N 次单位根之和 = 0\n")
            f.write("   - e^(i*pi) + 1 = 0 （欧拉恒等式，Euler's identity）\n")
            f.write("   - 乘以 e^(i*theta) 表示旋转 theta 弧度\n\n")
            f.write("6. Python 速查：\n")
            f.write("   - 内置功能（Built-in）： z = 3+2j, abs(z), z.conjugate(), z.real, z.imag\n")
            f.write("   - cmath: cmath.phase(z), cmath.exp(1j*theta), cmath.polar(z)\n")
            f.write("   - numpy: np.abs(z), np.angle(z), np.conj(z), np.fft.fft(signal)\n")
        print(f"\n  技能提示词输出已写入 {output_path}")
    except OSError:
        print("\n  无法写入技能提示词输出（请从本课目录运行）")


def print_summary():
    print()
    print()
    print("=" * 65)
    print("  总结（Summary）")
    print("=" * 65)
    print()
    print("  1. 复数 z = a + bi 对应平面上的点 (a, b)。")
    print("  2. 乘法执行旋转和缩放，除法执行其逆操作。")
    print("  3. 欧拉公式（Euler's formula）： e^(i*theta) = cos(theta) + i*sin(theta).")
    print("  4. 乘以 e^(i*theta) 表示旋转 theta 弧度.")
    print("  5. 复数乘法就是二维旋转（与旋转矩阵相同）。")
    print("  6. DFT 将信号分解为旋转相量（单位根）。")
    print("  7. Transformer 位置编码是")
    print("     不同频率的复指数。")
    print("  8. RoPE 使用显式复数乘法编码位置。")
    print()


if __name__ == "__main__":
    demo_arithmetic()
    demo_polar_conversion()
    demo_euler_formula()
    demo_rotation()
    demo_roots_of_unity()
    demo_dft()
    demo_phasor()
    demo_positional_encoding()
    write_skill_output()
    print_summary()
