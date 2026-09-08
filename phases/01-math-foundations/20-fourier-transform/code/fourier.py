import math


class Complex:
    def __init__(self, real=0.0, imag=0.0):
        self.real = float(real)
        self.imag = float(imag)

    def __add__(self, other):
        if isinstance(other, (int, float)):
            return Complex(self.real + other, self.imag)
        return Complex(self.real + other.real, self.imag + other.imag)

    def __radd__(self, other):
        return self.__add__(other)

    def __sub__(self, other):
        if isinstance(other, (int, float)):
            return Complex(self.real - other, self.imag)
        return Complex(self.real - other.real, self.imag - other.imag)

    def __mul__(self, other):
        if isinstance(other, (int, float)):
            return Complex(self.real * other, self.imag * other)
        r = self.real * other.real - self.imag * other.imag
        i = self.real * other.imag + self.imag * other.real
        return Complex(r, i)

    def __rmul__(self, other):
        return self.__mul__(other)

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


def euler(theta):
    return Complex(math.cos(theta), math.sin(theta))


def dft(x):
    N = len(x)
    result = []
    for k in range(N):
        total = Complex(0, 0)
        for n in range(N):
            angle = -2 * math.pi * k * n / N
            xn = x[n] if isinstance(x[n], Complex) else Complex(x[n])
            total = total + xn * euler(angle)
        result.append(total)
    return result


def idft(X):
    N = len(X)
    result = []
    for n in range(N):
        total = Complex(0, 0)
        for k in range(N):
            angle = 2 * math.pi * k * n / N
            xk = X[k] if isinstance(X[k], Complex) else Complex(X[k])
            total = total + xk * euler(angle)
        result.append(Complex(total.real / N, total.imag / N))
    return result


def fft(x):
    N = len(x)
    if N <= 1:
        return [x[0] if isinstance(x[0], Complex) else Complex(x[0])]
    if N % 2 != 0:
        return dft(x)

    even = fft([x[i] for i in range(0, N, 2)])
    odd = fft([x[i] for i in range(1, N, 2)])

    result = [Complex(0)] * N
    for k in range(N // 2):
        angle = -2 * math.pi * k / N
        twiddle = euler(angle)
        t = twiddle * odd[k]
        result[k] = even[k] + t
        result[k + N // 2] = even[k] - t
    return result


def ifft(X):
    N = len(X)
    conj_X = [xk.conjugate() if isinstance(xk, Complex) else Complex(xk) for xk in X]
    result = fft(conj_X)
    return [Complex(r.real / N, -r.imag / N) for r in result]


def power_spectrum(X):
    return [xk.real ** 2 + xk.imag ** 2 for xk in X]


def magnitude_spectrum(X):
    return [xk.magnitude() for xk in X]


def spectral_analysis(signal, sample_rate):
    N = len(signal)
    X = fft(signal)
    magnitudes = magnitude_spectrum(X)
    freqs = [k * sample_rate / N for k in range(N)]
    return freqs[:N // 2 + 1], magnitudes[:N // 2 + 1]


def hann_window(N):
    return [0.5 * (1 - math.cos(2 * math.pi * n / (N - 1))) for n in range(N)]


def hamming_window(N):
    return [0.54 - 0.46 * math.cos(2 * math.pi * n / (N - 1)) for n in range(N)]


def apply_window(signal, window):
    return [s * w for s, w in zip(signal, window)]


def convolve_direct(x, h):
    N = len(x)
    M = len(h)
    out_len = N + M - 1
    result = [0.0] * out_len
    for n in range(out_len):
        total = 0.0
        for k in range(M):
            if 0 <= n - k < N:
                total += x[n - k] * h[k]
        result[n] = total
    return result


def convolve_fft(x, h):
    if len(x) == 0 or len(h) == 0:
        return []
    N = len(x) + len(h) - 1
    padded_N = 1
    while padded_N < N:
        padded_N *= 2

    x_padded = list(x) + [0.0] * (padded_N - len(x))
    h_padded = list(h) + [0.0] * (padded_N - len(h))

    X = fft(x_padded)
    H = fft(h_padded)

    Y = [xk * hk for xk, hk in zip(X, H)]

    y = ifft(Y)
    return [y[n].real for n in range(N)]


def generate_signal(frequencies, amplitudes, N, sample_rate):
    signal = [0.0] * N
    for freq, amp in zip(frequencies, amplitudes):
        for n in range(N):
            t = n / sample_rate
            signal[n] += amp * math.sin(2 * math.pi * freq * t)
    return signal


def positional_encoding(pos, d_model):
    pe = [0.0] * d_model
    for i in range(d_model // 2):
        freq = 1.0 / (10000 ** (2 * i / d_model))
        angle = pos * freq
        pe[2 * i] = math.sin(angle)
        pe[2 * i + 1] = math.cos(angle)
    return pe


def demo_pure_sine():
    print("=" * 65)
    print("  纯正弦波的离散傅里叶变换（DFT）")
    print("=" * 65)
    print()

    N = 32
    sample_rate = 32
    freq = 5
    signal = generate_signal([freq], [1.0], N, sample_rate)

    print(f"  信号（Signal）： sin(2*pi*{freq}*t), {N} 个样本，采样率为 {sample_rate} Hz")
    print()

    X = dft(signal)
    mags = magnitude_spectrum(X)

    print(f"  {'频点（Freq bin）k':<12s} {'频率（Frequency，Hz）':>14s} {'|X[k]|':>10s}")
    print(f"  {'-' * 12} {'-' * 14} {'-' * 10}")

    for k in range(N // 2 + 1):
        f_hz = k * sample_rate / N
        if mags[k] > 0.01:
            print(f"  k={k:<8d} {f_hz:>14.1f} {mags[k]:>10.4f}")

    print()
    print(f"  峰值位于 k={freq}，对应 {freq} Hz。")
    print(f"  DFT 正确识别了频率。")


def demo_multi_frequency():
    print()
    print()
    print("=" * 65)
    print("  叠加正弦波的离散傅里叶变换（DFT）")
    print("=" * 65)
    print()

    N = 64
    sample_rate = 64
    freqs = [3, 7, 15]
    amps = [1.0, 0.5, 0.3]

    signal = generate_signal(freqs, amps, N, sample_rate)

    print(f"  信号（Signal）： {amps[0]}*sin(2*pi*{freqs[0]}*t) + "
          f"{amps[1]}*sin(2*pi*{freqs[1]}*t) + "
          f"{amps[2]}*sin(2*pi*{freqs[2]}*t)")
    print(f"  {N} 个样本，采样率为 {sample_rate} Hz")
    print()

    X = fft(signal)
    mags = magnitude_spectrum(X)

    print(f"  恢复出的频率（幅度 > 0.5）：")
    print(f"  {'频率（Freq，Hz）':>10s} {'|X[k]|':>10s} {'预期 amp * N/2':>20s}")
    print(f"  {'-' * 10} {'-' * 10} {'-' * 20}")

    for k in range(N // 2 + 1):
        if mags[k] > 0.5:
            f_hz = k * sample_rate / N
            expected = ""
            for freq, amp in zip(freqs, amps):
                if abs(f_hz - freq) < 0.1:
                    expected = f"{amp * N / 2:.1f}"
            print(f"  {f_hz:>10.1f} {mags[k]:>10.4f} {expected:>20s}")

    print()
    print("  三个频率均已正确恢复。")
    print("  幅度与预期值 (amplitude * N/2) 一致。")


def demo_fft_vs_dft():
    print()
    print()
    print("=" * 65)
    print("  快速傅里叶变换（FFT）与 DFT：结果相同，速度更快")
    print("=" * 65)
    print()

    N = 32
    import random
    random.seed(42)
    signal = [random.gauss(0, 1) for _ in range(N)]

    X_dft = dft(signal)
    X_fft = fft(signal)

    max_error = 0.0
    for k in range(N):
        diff_real = abs(X_dft[k].real - X_fft[k].real)
        diff_imag = abs(X_dft[k].imag - X_fft[k].imag)
        max_error = max(max_error, diff_real, diff_imag)

    print(f"  随机信号，N = {N}")
    print(f"  DFT 与 FFT 的最大差异： {max_error:.2e}")
    print(f"  一致： {max_error < 1e-10}")
    print()

    print(f"  {'k':<6s} {'DFT |X[k]|':>14s} {'FFT |X[k]|':>14s} {'差异（Diff）':>12s}")
    print(f"  {'-' * 6} {'-' * 14} {'-' * 14} {'-' * 12}")
    for k in range(8):
        d_mag = X_dft[k].magnitude()
        f_mag = X_fft[k].magnitude()
        diff = abs(d_mag - f_mag)
        print(f"  {k:<6d} {d_mag:>14.8f} {f_mag:>14.8f} {diff:>12.2e}")

    print(f"  ... （另有 {N - 8} 个系数）")
    print()

    print(f"  DFT 复杂度（Complexity）： O(N^2) = {N * N} 次乘法")
    print(f"  FFT 复杂度（Complexity）： O(N*log2(N)) = {int(N * math.log2(N))} 次乘法")
    print(f"  加速比（Speedup）： {N * N / (N * math.log2(N)):.1f}x")


def demo_reconstruction():
    print()
    print()
    print("=" * 65)
    print("  完美重构（Perfect Reconstruction）：DFT -> IDFT")
    print("=" * 65)
    print()

    import random
    random.seed(99)
    N = 16
    signal = [random.gauss(0, 2) for _ in range(N)]

    X = fft(signal)
    reconstructed = ifft(X)

    max_err = max(abs(reconstructed[n].real - signal[n]) for n in range(N))

    print(f"  原始信号与重构信号 (N={N})：")
    print(f"  {'n':<4s} {'原始值（Original）':>12s} {'重构值（Reconstructed）':>14s} {'误差（Error）':>12s}")
    print(f"  {'-' * 4} {'-' * 12} {'-' * 14} {'-' * 12}")

    for n in range(N):
        err = abs(reconstructed[n].real - signal[n])
        print(f"  {n:<4d} {signal[n]:>12.6f} {reconstructed[n].real:>14.6f} {err:>12.2e}")

    print()
    print(f"  最大重构误差（Reconstruction error）： {max_err:.2e}")
    print(f"  完美重构（Perfect reconstruction）： {max_err < 1e-10}")


def demo_convolution_theorem():
    print()
    print()
    print("=" * 65)
    print("  卷积定理（Convolution Theorem）")
    print("=" * 65)
    print()

    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    h = [1.0, 1.0, 1.0]

    direct = convolve_direct(x, h)
    fft_result = convolve_fft(x, h)

    print(f"  信号（Signal）x = {x}")
    print(f"  滤波器（Filter）h = {h}")
    print(f"  线性卷积（Linear convolution，x * h）：")
    print()

    print(f"  {'n':<4s} {'直接计算（Direct）':>10s} {'基于 FFT':>10s} {'差异（Diff）':>12s}")
    print(f"  {'-' * 4} {'-' * 10} {'-' * 10} {'-' * 12}")

    max_err = 0.0
    for n in range(len(direct)):
        diff = abs(direct[n] - fft_result[n])
        max_err = max(max_err, diff)
        print(f"  {n:<4d} {direct[n]:>10.4f} {fft_result[n]:>10.4f} {diff:>12.2e}")

    print()
    print(f"  最大差异： {max_err:.2e}")
    print(f"  一致： {max_err < 1e-8}")
    print()
    print("  时域卷积 = 频域乘法。")
    print("  直接卷积（Direct convolution）： O(N*M) = O(15)")
    print("  FFT 卷积：N 较大时为 O(N*log(N))")


def demo_windowing():
    print()
    print()
    print("=" * 65)
    print("  加窗与频谱泄漏（Windowing and Spectral Leakage）")
    print("=" * 65)
    print()

    N = 64
    sample_rate = 64
    freq = 7.5

    signal = [math.sin(2 * math.pi * freq * n / sample_rate) for n in range(N)]

    X_rect = fft(signal)
    mags_rect = magnitude_spectrum(X_rect)

    hann = hann_window(N)
    signal_hann = apply_window(signal, hann)
    X_hann = fft(signal_hann)
    mags_hann = magnitude_spectrum(X_hann)

    hamm = hamming_window(N)
    signal_hamm = apply_window(signal, hamm)
    X_hamm = fft(signal_hamm)
    mags_hamm = magnitude_spectrum(X_hamm)

    print(f"  信号（Signal）： sin(2*pi*{freq}*t) ，频率位于两个频点之间")
    print(f"  N = {N}, 采样率（Sample rate）= {sample_rate} Hz")
    print(f"  频率分辨率（Frequency resolution）： {sample_rate / N:.2f} Hz/频点")
    print(f"  {freq} Hz 位于频点 7 和频点 8 之间")
    print()

    print(f"  {'频率（Freq，Hz）':>10s} {'未加窗（No window）':>12s} {'Hann':>12s} {'Hamming':>12s}")
    print(f"  {'-' * 10} {'-' * 12} {'-' * 12} {'-' * 12}")

    for k in range(N // 2 + 1):
        f_hz = k * sample_rate / N
        if mags_rect[k] > 0.5 or (5 <= f_hz <= 11):
            print(f"  {f_hz:>10.1f} {mags_rect[k]:>12.4f} "
                  f"{mags_hann[k]:>12.4f} {mags_hamm[k]:>12.4f}")

    print()
    print("  不加窗时，能量会泄漏到相邻频点。")
    print("  汉宁窗（Hann）和海明窗（Hamming）将能量集中在真实频率附近。")
    print("  权衡：窗函数会加宽主峰，但能抑制旁瓣（Side lobes）。")


def demo_parseval():
    print()
    print()
    print("=" * 65)
    print("  帕塞瓦尔定理（Parseval's Theorem）：能量守恒")
    print("=" * 65)
    print()

    import random
    random.seed(7)
    N = 32
    signal = [random.gauss(0, 1) for _ in range(N)]

    time_energy = sum(s ** 2 for s in signal)

    X = fft(signal)
    freq_energy = sum(xk.real ** 2 + xk.imag ** 2 for xk in X) / N

    print(f"  信号（Signal）： {N} 个随机样本")
    print(f"  时域能量（Time-domain energy）：  sum |x[n]|^2 = {time_energy:.6f}")
    print(f"  频域能量（Frequency-domain energy）：  (1/N) sum |X[k]|^2 = {freq_energy:.6f}")
    print(f"  差异： {abs(time_energy - freq_energy):.2e}")
    print(f"  能量守恒（Energy conserved）： {abs(time_energy - freq_energy) < 1e-10}")


def demo_positional_encoding():
    print()
    print()
    print("=" * 65)
    print("  位置编码频率（Positional Encoding Frequencies）")
    print("=" * 65)
    print()

    d_model = 16
    max_pos = 8

    print(f"  d_model = {d_model}, 位置 0-{max_pos - 1}")
    print()

    print(f"  每对维度的频率：")
    for i in range(d_model // 2):
        freq = 1.0 / (10000 ** (2 * i / d_model))
        wavelength = 2 * math.pi / freq if freq > 0 else float('inf')
        print(f"    dim ({2 * i:>2d},{2 * i + 1:>2d}): freq = {freq:.8f}  "
              f"wavelength = {wavelength:.1f}")

    print()
    print(f"  位置编码之间的点积（Dot product）：")
    print(f"  （仅取决于距离，而非绝对位置）")
    print()

    print(f"  {'pos_i':>6s} {'pos_j':>6s} {'dist':>6s} {'点积（Dot product）':>12s}")
    print(f"  {'-' * 6} {'-' * 6} {'-' * 6} {'-' * 12}")

    pairs = [(0, 0), (0, 1), (0, 2), (0, 4), (1, 2), (1, 3), (2, 4), (3, 7)]
    for p1, p2 in pairs:
        pe1 = positional_encoding(p1, d_model)
        pe2 = positional_encoding(p2, d_model)
        dot = sum(a * b for a, b in zip(pe1, pe2))
        print(f"  {p1:>6d} {p2:>6d} {abs(p2 - p1):>6d} {dot:>12.4f}")

    print()
    print("  间距相同的位置对具有相似的点积。")
    print("  这使模型能够通过注意力（Attention）学习相对位置。")


def demo_frequency_scaling():
    print()
    print()
    print("=" * 65)
    print("  FFT 复杂度的增长（Complexity Scaling）")
    print("=" * 65)
    print()

    print(f"  {'N':>8s} {'DFT O(N^2)':>14s} {'FFT O(N logN)':>16s} {'加速比（Speedup）':>10s}")
    print(f"  {'-' * 8} {'-' * 14} {'-' * 16} {'-' * 10}")

    for exp in range(3, 14):
        N = 2 ** exp
        dft_ops = N * N
        fft_ops = int(N * math.log2(N))
        speedup = dft_ops / fft_ops
        print(f"  {N:>8d} {dft_ops:>14,d} {fft_ops:>16,d} {speedup:>10.1f}x")


def write_prompt_output():
    output_path = "outputs/prompt-spectral-analyzer.md"
    try:
        with open(output_path, "w") as f:
            f.write("---\n")
            f.write("name: prompt-spectral-analyzer\n")
            f.write("description: 指导使用傅里叶变换（Fourier transform）技术分析信号的频率成分\n")
            f.write("phase: 1\n")
            f.write("lesson: 20\n")
            f.write("---\n\n")
            f.write("你是频谱分析（Spectral analysis）专家，帮助工程师使用傅里叶变换技术分析信号的频率成分。\n\n")
            f.write("获得信号或信号描述后，按以下步骤指导分析：\n\n")
            f.write("1. **确定采样参数（Sampling parameters）。**\n")
            f.write("   - 采样率（Sampling rate，fs）是多少？它决定可检测的最高频率 (Nyquist = fs/2)。\n")
            f.write("   - 样本数（N）是多少？它决定频率分辨率 (delta_f = fs/N)。\n")
            f.write("   - 信号长度是 2 的幂吗？如果不是，建议补零（Zero-padding）以提高 FFT 的效率。\n\n")
            f.write("2. **选择窗函数（Window function）。**\n")
            f.write("   - 信号在分析窗口内是否恰好包含完整周期？如果是，则无需加窗。\n")
            f.write("   - 常规分析：使用汉宁窗（Hann window），在分辨率与泄漏之间取得平衡。\n")
            f.write("   - 音频/语音：使用海明窗（Hamming window）。\n")
            f.write("   - 最注重旁瓣抑制时：使用布莱克曼窗（Blackman window）。\n")
            f.write("   - 注意：加窗会加宽峰值，但能减少泄漏。\n\n")
            f.write("3. **计算并解释频谱（Spectrum）。**\n")
            f.write("   - 功率谱（Power spectrum）|X[k]|^2 显示各频率上的能量。\n")
            f.write("   - 功率谱中的峰值表示主导频率（Dominant frequencies）。\n")
            f.write("   - X[0] 是直流分量（DC component，signal mean * N）。\n")
            f.write("   - 对于实值信号，只需查看频点 0 到 N/2（上半部分为镜像）。\n")
            f.write("   - 频点 k 的频率： f_k = k * fs / N.\n\n")
            f.write("4. **识别主导频率（Dominant frequencies）。**\n")
            f.write("   - 找出高于噪声阈值的峰值。\n")
            f.write("   - 将频点索引转换为 Hz： freq = k * fs / N.\n")
            f.write("   - 检查谐波（Harmonics），即基频整数倍处的峰值。\n")
            f.write("   - 检查混叠频率（Aliased frequencies，actual frequency = fs - apparent frequency）。\n\n")
            f.write("5. **需要注意的常见问题。**\n")
            f.write("   - 频谱泄漏（Spectral leakage）：窗口内周期数不是整数时，能量会扩散到多个频点。\n")
            f.write("   - 混叠（Aliasing）：信号中高于 fs/2 的频率会折叠回频谱。\n")
            f.write("   - 直流偏移（DC offset）：较大的 X[0] 会掩盖附近的低频成分。执行 FFT 前先去除均值。\n")
            f.write("   - 补零（Zero-padding）增加频点密度，但不会提高实际频率分辨率。\n")
            f.write("   - 循环卷积与线性卷积（Circular vs linear convolution）：DFT 得到循环卷积，计算线性卷积需要补零。\n\n")
            f.write("6. **进行卷积分析（Convolution analysis）时。**\n")
            f.write("   - 时域卷积 = 频域乘法。\n")
            f.write("   - 对于大卷积核，基于 FFT 的卷积更快：O(N log N) 对比 O(N*M)。\n")
            f.write("   - 将两个信号都补零至长度 N + M - 1，以正确计算线性卷积。\n")
        print(f"\n  提示词输出已写入 {output_path}")
    except OSError:
        print("\n  无法写入提示词输出（请从本课目录运行）")


def print_summary():
    print()
    print()
    print("=" * 65)
    print("  总结（Summary）")
    print("=" * 65)
    print()
    print("  1. DFT 将 N 个时域样本转换为 N 个频率系数。")
    print("  2. 每个 X[k] 衡量信号与频率 k 的相关性。")
    print("  3. FFT 将 DFT 的计算复杂度从 O(N^2) 降至 O(N log N)。")
    print("  4. DFT 与 IDFT 完全互逆，不会丢失信息。")
    print("  5. 卷积定理（Convolution theorem）：时域卷积 =")
    print("     频域乘法，这就是基于 FFT 的卷积速度快的原因。")
    print("  6. 加窗可以减少非周期信号的频谱泄漏。")
    print("  7. 帕塞瓦尔定理（Parseval's theorem）：变换前后能量守恒。")
    print("  8. Transformer 位置编码使用相同的频率")
    print("     分解思想，使每个位置获得独特的频谱。")
    print()


if __name__ == "__main__":
    demo_pure_sine()
    demo_multi_frequency()
    demo_fft_vs_dft()
    demo_reconstruction()
    demo_convolution_theorem()
    demo_windowing()
    demo_parseval()
    demo_positional_encoding()
    demo_frequency_scaling()
    write_prompt_output()
    print_summary()
