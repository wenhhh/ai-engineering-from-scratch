import numpy as np
import warnings
warnings.filterwarnings("ignore")


def true_function(x):
    return np.sin(1.5 * x) + 0.5 * x


def generate_data(n_samples=30, noise_std=0.5, x_range=(-3, 3), seed=None):
    rng = np.random.RandomState(seed)
    x = rng.uniform(x_range[0], x_range[1], n_samples)
    y = true_function(x) + rng.normal(0, noise_std, n_samples)
    return x, y


def fit_polynomial(x_train, y_train, degree, lam=0.0):
    X = np.column_stack([x_train ** d for d in range(degree + 1)])
    if lam > 0:
        penalty = lam * np.eye(X.shape[1])
        penalty[0, 0] = 0
        w = np.linalg.solve(X.T @ X + penalty, X.T @ y_train)
    else:
        w = np.linalg.lstsq(X, y_train, rcond=None)[0]
    return w


def predict_polynomial(x, w):
    degree = len(w) - 1
    X = np.column_stack([x ** d for d in range(degree + 1)])
    return X @ w


def bias_variance_decomposition(
    degrees,
    n_bootstrap=200,
    n_train=30,
    noise_std=0.5,
    n_test=100,
    lam=0.0,
):
    rng = np.random.RandomState(42)
    x_test = np.linspace(-2.5, 2.5, n_test)
    y_true = true_function(x_test)

    results = {}

    for degree in degrees:
        predictions = np.zeros((n_bootstrap, n_test))

        for b in range(n_bootstrap):
            x_train, y_train = generate_data(
                n_samples=n_train, noise_std=noise_std, seed=rng.randint(0, 100000)
            )
            w = fit_polynomial(x_train, y_train, degree, lam=lam)
            predictions[b] = predict_polynomial(x_test, w)

        mean_pred = predictions.mean(axis=0)
        bias_sq = np.mean((mean_pred - y_true) ** 2)
        variance = np.mean(predictions.var(axis=0))
        total_error = np.mean(np.mean((predictions - y_true) ** 2, axis=1)) + noise_std ** 2

        results[degree] = {
            "bias_sq": bias_sq,
            "variance": variance,
            "total_error": total_error,
            "noise": noise_std ** 2,
        }

    return results


def print_decomposition(results):
    print(f"{'次数（Degree）':>6}  {'偏差平方（Bias^2）':>10}  {'方差（Variance）':>10}  {'噪声（Noise）':>10}  {'总计（Total）':>10}  {'B+V+N':>10}")
    print("-" * 70)
    for degree, r in sorted(results.items()):
        bvn = r["bias_sq"] + r["variance"] + r["noise"]
        print(
            f"{degree:>6d}  {r['bias_sq']:>10.4f}  {r['variance']:>10.4f}  "
            f"{r['noise']:>10.4f}  {r['total_error']:>10.4f}  {bvn:>10.4f}"
        )


def find_optimal(results):
    best_degree = min(results, key=lambda d: results[d]["total_error"])
    return best_degree


def demo_basic_decomposition():
    print("=" * 70)
    print("偏差-方差分解（Bias-Variance Decomposition）")
    print("真实函数：sin(1.5x) + 0.5x")
    print("噪声标准差（Noise Std）：0.5，训练样本：30，自助采样（Bootstrap）轮数：200")
    print("=" * 70)
    print()

    degrees = [1, 2, 3, 5, 7, 10, 15]
    results = bias_variance_decomposition(degrees)
    print_decomposition(results)

    best = find_optimal(results)
    print(f"\n最佳次数（Degree）： {best}")
    print(f"  偏差平方（Bias^2）：   {results[best]['bias_sq']:.4f}")
    print(f"  方差（Variance）： {results[best]['variance']:.4f}")
    print(f"  总计（Total）：    {results[best]['total_error']:.4f}")


def demo_complexity_tradeoff():
    print()
    print("=" * 70)
    print("模型复杂度权衡（Model Complexity Tradeoff）")
    print("将多项式次数从 1 扫描至 15")
    print("=" * 70)
    print()

    degrees = list(range(1, 16))
    results = bias_variance_decomposition(degrees)

    print(f"{'次数（Degree）':>6}  {'偏差平方（Bias^2）':>10}  {'方差（Variance）':>10}  {'总计（Total）':>10}  {'主导项（Dominant）':>12}")
    print("-" * 60)
    for degree in degrees:
        r = results[degree]
        dominant = "偏差（Bias）" if r["bias_sq"] > r["variance"] else "方差（Variance）"
        print(
            f"{degree:>6d}  {r['bias_sq']:>10.4f}  {r['variance']:>10.4f}  "
            f"{r['total_error']:>10.4f}  {dominant:>12}"
        )

    crossover = None
    for d in degrees[:-1]:
        if results[d]["bias_sq"] > results[d]["variance"]:
            if results[d + 1]["bias_sq"] <= results[d + 1]["variance"]:
                crossover = d + 1
                break

    if crossover:
        print(f"\n偏差与方差在次数 {crossover} 处交叉")
        print("低于此次数：偏差占主导，出现欠拟合（Underfitting）")
        print("高于此次数：方差占主导，出现过拟合（Overfitting）")


def demo_regularization_effect():
    print()
    print("=" * 70)
    print("正则化效果（Regularization Effect，L2 / 岭回归 Ridge）")
    print("固定 degree=10，扫描 lambda")
    print("=" * 70)
    print()

    lambdas = [0.0, 0.001, 0.01, 0.1, 1.0, 10.0, 100.0]

    print(f"{'Lambda':>10}  {'偏差平方（Bias^2）':>10}  {'方差（Variance）':>10}  {'总计（Total）':>10}")
    print("-" * 50)

    for lam in lambdas:
        results = bias_variance_decomposition([10], lam=lam)
        r = results[10]
        print(f"{lam:>10.3f}  {r['bias_sq']:>10.4f}  {r['variance']:>10.4f}  {r['total_error']:>10.4f}")

    print()
    print("随着 lambda 增大：")
    print("  - 方差下降（模型受到更多约束）")
    print("  - 偏差增加（模型被迫变得更简单）")
    print("  - 最佳 lambda 平衡这两种效果")


def demo_data_size_effect():
    print()
    print("=" * 70)
    print("训练集规模的影响（Training Set Size Effect）")
    print("固定 degree=5，改变 n_train")
    print("=" * 70)
    print()

    sizes = [10, 20, 50, 100, 200, 500]

    print(f"{'N_train':>8}  {'偏差平方（Bias^2）':>10}  {'方差（Variance）':>10}  {'总计（Total）':>10}")
    print("-" * 50)

    for n in sizes:
        results = bias_variance_decomposition([5], n_train=n)
        r = results[5]
        print(f"{n:>8d}  {r['bias_sq']:>10.4f}  {r['variance']:>10.4f}  {r['total_error']:>10.4f}")

    print()
    print("更多数据会减小方差，但不会影响偏差。")
    print("如果问题在于高偏差，增加数据无济于事。")


def demo_diagnosis():
    print()
    print("=" * 70)
    print("欠拟合（Underfitting）与过拟合（Overfitting）诊断")
    print("=" * 70)
    print()

    rng = np.random.RandomState(42)
    x_train, y_train = generate_data(n_samples=30, seed=42)
    x_test, y_test = generate_data(n_samples=100, seed=99)

    cases = [
        (1, "线性模型（Linear，次数 1）"),
        (4, "多项式（Polynomial，次数 4）"),
        (15, "多项式（Polynomial，次数 15）"),
    ]

    for degree, name in cases:
        w = fit_polynomial(x_train, y_train, degree)
        train_pred = predict_polynomial(x_train, w)
        test_pred = predict_polynomial(x_test, w)

        train_mse = np.mean((train_pred - y_train) ** 2)
        test_mse = np.mean((test_pred - y_test) ** 2)
        gap = test_mse - train_mse

        if train_mse > 0.5 and test_mse > 0.5 and gap < train_mse * 0.5:
            diagnosis = "高偏差（High Bias，欠拟合 Underfitting）"
        elif gap > train_mse * 2:
            diagnosis = "高方差（High Variance，过拟合 Overfitting）"
        else:
            diagnosis = "拟合合理（Reasonable Fit）"

        print(f"{name}:")
        print(f"  训练均方误差（Train MSE）： {train_mse:.4f}")
        print(f"  测试均方误差（Test MSE）：  {test_mse:.4f}")
        print(f"  差距（Gap）：       {gap:.4f}")
        print(f"  诊断（Diagnosis）： {diagnosis}")
        print()


def demo_learning_curves():
    print()
    print("=" * 70)
    print("学习曲线（Learning Curves）")
    print("随训练集规模增大，比较训练误差与测试误差")
    print("=" * 70)
    print()

    rng = np.random.RandomState(42)
    x_test = np.linspace(-2.5, 2.5, 200)
    y_test = true_function(x_test)

    sizes = [10, 15, 20, 30, 50, 75, 100, 150, 200, 300]

    for degree, label in [(1, "次数 1（高偏差 High Bias）"), (5, "次数 5（偏差与方差均衡）"), (12, "次数 12（高方差 High Variance）")]:
        print(f"  {label}:")
        print(f"  {'N_train':>8}  {'训练均方误差（Train MSE）':>10}  {'测试均方误差（Test MSE）':>10}  {'差距（Gap）':>10}")
        print(f"  {'-' * 48}")

        for n in sizes:
            train_errors = []
            test_errors = []
            for seed in range(50):
                x_train, y_train = generate_data(n_samples=n, seed=rng.randint(0, 100000))
                try:
                    w = fit_polynomial(x_train, y_train, degree)
                    train_pred = predict_polynomial(x_train, w)
                    test_pred = predict_polynomial(x_test, w)
                    train_mse = np.mean((train_pred - y_train) ** 2)
                    test_mse = np.mean((test_pred - y_test) ** 2)
                    train_errors.append(train_mse)
                    test_errors.append(test_mse)
                except (np.linalg.LinAlgError, ValueError):
                    continue

            if train_errors:
                avg_train = np.mean(train_errors)
                avg_test = np.mean(test_errors)
                gap = avg_test - avg_train
                print(f"  {n:>8d}  {avg_train:>10.4f}  {avg_test:>10.4f}  {gap:>10.4f}")

        print()

    print("高偏差（次数 1）：两条曲线都收敛到较高的误差，差距始终较小。")
    print("高方差（次数 12）：训练误差保持较低，测试误差保持较高。")
    print("增加数据可降低方差，但无法解决偏差问题。")


def demo_regularization_sweep():
    print()
    print("=" * 70)
    print("正则化扫描（Regularization Sweep）：岭回归（Ridge）的 alpha 与偏差/方差")
    print("固定 degree=15，将 alpha 从 0.001 扫描至 100")
    print("=" * 70)
    print()

    alphas = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]

    print(f"  {'Alpha':>10}  {'偏差平方（Bias^2）':>10}  {'方差（Variance）':>10}  {'总计（Total）':>10}  {'主导项（Dominant）':>12}")
    print(f"  {'-' * 60}")

    best_alpha = None
    best_total = float("inf")

    for alpha in alphas:
        results = bias_variance_decomposition([15], lam=alpha, n_bootstrap=200)
        r = results[15]
        dominant = "偏差（Bias）" if r["bias_sq"] > r["variance"] else "方差（Variance）"
        print(
            f"  {alpha:>10.3f}  {r['bias_sq']:>10.4f}  {r['variance']:>10.4f}  "
            f"{r['total_error']:>10.4f}  {dominant:>12}"
        )
        if r["total_error"] < best_total:
            best_total = r["total_error"]
            best_alpha = alpha

    print()
    print(f"最佳 alpha： {best_alpha}")
    print(f"  最佳参数下的总误差： {best_total:.4f}")
    print()
    print("alpha 较小：方差占主导（模型缺乏约束，拟合了噪声）")
    print("alpha 较大：偏差占主导（模型受到过多约束，未捕获信号）")
    print("最佳 alpha 平衡两者，位于 U 形曲线的底部。")


if __name__ == "__main__":
    demo_basic_decomposition()
    demo_complexity_tradeoff()
    demo_regularization_effect()
    demo_data_size_effect()
    demo_diagnosis()
    demo_learning_curves()
    demo_regularization_sweep()
    print("所有偏差-方差（Bias-Variance）演示已完成。")
