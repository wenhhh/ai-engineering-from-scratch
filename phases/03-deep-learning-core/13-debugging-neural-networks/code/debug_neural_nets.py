import torch
import torch.nn as nn
import math
import copy


class NetworkDebugger:
    def __init__(self, model):
        self.model = model
        self.activation_stats = {}
        self.gradient_stats = {}
        self.loss_history = []
        self.hooks = []
        self._register_hooks()

    def _register_hooks(self):
        for name, module in self.model.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d, nn.ReLU, nn.LeakyReLU)):
                hook = module.register_forward_hook(self._make_activation_hook(name))
                self.hooks.append(hook)
                hook = module.register_full_backward_hook(self._make_gradient_hook(name))
                self.hooks.append(hook)

    def _make_activation_hook(self, name):
        def hook(module, input, output):
            with torch.no_grad():
                out = output.detach().float()
                self.activation_stats[name] = {
                    "mean": out.mean().item(),
                    "std": out.std().item(),
                    "fraction_zero": (out == 0).float().mean().item(),
                    "min": out.min().item(),
                    "max": out.max().item(),
                }
        return hook

    def _make_gradient_hook(self, name):
        def hook(module, grad_input, grad_output):
            if grad_output[0] is not None:
                with torch.no_grad():
                    grad = grad_output[0].detach().float()
                    self.gradient_stats[name] = {
                        "mean": grad.mean().item(),
                        "std": grad.std().item(),
                        "abs_mean": grad.abs().mean().item(),
                        "max": grad.abs().max().item(),
                    }
        return hook

    def record_loss(self, loss_value):
        self.loss_history.append(loss_value)

    def check_loss_health(self):
        if len(self.loss_history) < 2:
            return "NOT_ENOUGH_DATA"
        recent = self.loss_history[-10:]
        if any(math.isnan(v) or math.isinf(v) for v in recent):
            return "NAN_OR_INF"
        if len(self.loss_history) >= 20:
            first_half = sum(self.loss_history[:10]) / 10
            second_half = sum(self.loss_history[-10:]) / 10
            if second_half >= first_half * 0.99:
                return "NOT_DECREASING"
        if len(recent) >= 5:
            diffs = [recent[i + 1] - recent[i] for i in range(len(recent) - 1)]
            if max(diffs) - min(diffs) > 2 * abs(sum(diffs) / len(diffs) + 1e-10):
                return "OSCILLATING"
        return "HEALTHY"

    def check_activations(self):
        issues = []
        for name, stats in self.activation_stats.items():
            if stats["fraction_zero"] > 0.5:
                issues.append(
                    f"DEAD_NEURONS（死亡神经元）：{name} 中有 {stats['fraction_zero']:.0%} 的激活值为零"
                )
            if abs(stats["mean"]) > 10:
                issues.append(
                    f"EXPLODING_ACTIVATIONS（激活值爆炸）： {name} 均值（mean）={stats['mean']:.2f}"
                )
            if stats["std"] < 1e-6:
                issues.append(
                    f"COLLAPSED_ACTIVATIONS（激活值坍缩）： {name} 标准差（std）={stats['std']:.2e}"
                )
        return issues if issues else ["HEALTHY"]

    def check_gradients(self):
        issues = []
        grad_magnitudes = []
        for name, stats in self.gradient_stats.items():
            grad_magnitudes.append((name, stats["abs_mean"]))
            if stats["abs_mean"] < 1e-7:
                issues.append(
                    f"VANISHING_GRADIENT（梯度消失）： {name} 绝对值均值（abs_mean）={stats['abs_mean']:.2e}"
                )
            if stats["abs_mean"] > 100:
                issues.append(
                    f"EXPLODING_GRADIENT（梯度爆炸）： {name} 绝对值均值（abs_mean）={stats['abs_mean']:.2e}"
                )
        if len(grad_magnitudes) >= 2:
            first_mag = grad_magnitudes[0][1]
            last_mag = grad_magnitudes[-1][1]
            if last_mag > 0 and first_mag / (last_mag + 1e-15) > 100:
                issues.append(
                    f"GRADIENT_RATIO（梯度比）：first/last = {first_mag / (last_mag + 1e-15):.0f}x（梯度消失，vanishing）"
                )
        return issues if issues else ["HEALTHY"]

    def print_report(self):
        print("\n=== 神经网络调试报告（Network Debugger Report） ===")
        print(f"\n损失健康状态（Loss Health）： {self.check_loss_health()}")
        if self.loss_history:
            print(
                f"  最近 5 次损失： {[f'{v:.4f}' for v in self.loss_history[-5:]]}"
            )
        print("\n激活值诊断（Activation Diagnostics）：")
        for item in self.check_activations():
            print(f"  {item}")
        print("\n梯度诊断（Gradient Diagnostics）：")
        for item in self.check_gradients():
            print(f"  {item}")
        print("\n逐层激活值统计（Activation Stats）：")
        for name, stats in self.activation_stats.items():
            print(
                f"  {name}: 均值（mean）={stats['mean']:.4f} 标准差（std）={stats['std']:.4f} "
                f"零值比例（zero）={stats['fraction_zero']:.1%}"
            )
        print("\n逐层梯度统计（Gradient Stats）：")
        for name, stats in self.gradient_stats.items():
            print(
                f"  {name}: 绝对值均值（abs_mean）={stats['abs_mean']:.2e} 最大值（max）={stats['max']:.2e}"
            )

    def remove_hooks(self):
        for hook in self.hooks:
            hook.remove()
        self.hooks.clear()


def overfit_one_batch(model, x_batch, y_batch, criterion, lr=0.01, steps=200):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    model.train()
    print("\n=== 单批次过拟合测试（Overfit One Batch Test） ===")
    print(f"批次大小（Batch Size）： {x_batch.shape[0]}, 步数（Steps）： {steps}")

    for step in range(steps):
        optimizer.zero_grad()
        output = model(x_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()

        if step % 50 == 0 or step == steps - 1:
            with torch.no_grad():
                if output.shape[-1] == 1:
                    preds = (output > 0).float().squeeze()
                else:
                    preds = output.argmax(dim=1)
                targets = y_batch if y_batch.dim() == 1 else y_batch.squeeze()
                acc = (preds == targets).float().mean().item()
            print(f"  步骤 {step:3d} | 损失（Loss）：{loss.item():.6f} | 准确率（Accuracy）：{acc:.1%}")

    final_loss = loss.item()
    if final_loss > 0.1:
        print(
            f"\n  失败（FAIL）：损失未收敛（{final_loss:.4f}）。"
            f"模型或训练循环存在问题。"
        )
        return False
    print(f"\n  通过（PASS）：损失已收敛至 {final_loss:.6f}")
    return True


def find_learning_rate(
    model, x_data, y_data, criterion, start_lr=1e-7, end_lr=10, steps=100
):
    original_state = copy.deepcopy(model.state_dict())
    optimizer = torch.optim.SGD(model.parameters(), lr=start_lr)
    lr_mult = (end_lr / start_lr) ** (1 / steps)

    model.train()
    results = []
    best_loss = float("inf")
    current_lr = start_lr

    print("\n=== 学习率查找器（Learning Rate Finder） ===")

    for step in range(steps):
        optimizer.zero_grad()
        output = model(x_data)
        loss = criterion(output, y_data)

        if math.isnan(loss.item()) or loss.item() > best_loss * 10:
            break

        best_loss = min(best_loss, loss.item())
        results.append((current_lr, loss.item()))

        loss.backward()
        optimizer.step()

        current_lr *= lr_mult
        for param_group in optimizer.param_groups:
            param_group["lr"] = current_lr

    model.load_state_dict(original_state)

    if len(results) < 10:
        print("  无法完成学习率扫描（LR Sweep）：损失发散过快")
        return results

    min_loss_idx = min(range(len(results)), key=lambda i: results[i][1])
    suggested_lr = results[max(0, min_loss_idx - 10)][0]

    print(
        f"  共扫描 {len(results)} 步，学习率从 {start_lr:.0e} 到 {results[-1][0]:.0e}"
    )
    print(
        f"  最小损失为 {results[min_loss_idx][1]:.4f}，对应 lr={results[min_loss_idx][0]:.2e}"
    )
    print(f"  建议学习率（Learning Rate）： {suggested_lr:.2e}")

    return results


def _flat_to_multi_index(flat_idx, shape):
    multi_idx = []
    remaining = flat_idx
    for dim in reversed(shape):
        multi_idx.insert(0, remaining % dim)
        remaining //= dim
    return tuple(multi_idx)


def gradient_check(model, x, y, criterion, eps=1e-4):
    model.train()
    x_double = x.double()
    y_double = y.double()
    model_double = model.double()

    print("\n=== 梯度检查（Gradient Check） ===")
    overall_max_diff = 0
    checked = 0

    for name, param in model_double.named_parameters():
        if not param.requires_grad:
            continue

        layer_max_diff = 0

        model_double.zero_grad()
        output = model_double(x_double)
        loss = criterion(output, y_double)
        loss.backward()
        analytical_grad = param.grad.clone()

        num_checks = min(5, param.numel())
        for i in range(num_checks):
            idx = _flat_to_multi_index(i, param.shape)
            original = param.data[idx].item()

            param.data[idx] = original + eps
            with torch.no_grad():
                loss_plus = criterion(model_double(x_double), y_double).item()

            param.data[idx] = original - eps
            with torch.no_grad():
                loss_minus = criterion(model_double(x_double), y_double).item()

            param.data[idx] = original

            numerical = (loss_plus - loss_minus) / (2 * eps)
            analytical = analytical_grad[idx].item()

            denom = max(abs(numerical), abs(analytical), 1e-8)
            rel_diff = abs(numerical - analytical) / denom

            layer_max_diff = max(layer_max_diff, rel_diff)
            checked += 1

        overall_max_diff = max(overall_max_diff, layer_max_diff)
        status = "一致（OK）" if layer_max_diff < 1e-5 else "不匹配（MISMATCH）"
        print(f"  {name}: 最大相对差异（max_rel_diff）={layer_max_diff:.2e} [{status}]")

    model.float()

    print(f"\n  已检查 {checked} 个参数")
    if overall_max_diff < 1e-5:
        print("  通过（PASS）：梯度一致（rel_diff < 1e-5）")
    elif overall_max_diff < 1e-3:
        print("  警告（WARN）：存在小幅差异（1e-5 < rel_diff < 1e-3）")
    else:
        print("  失败（FAIL）：检测到梯度不匹配（rel_diff > 1e-3）")
    return overall_max_diff


def demo_broken_networks():
    torch.manual_seed(42)
    x = torch.randn(64, 10)
    y = (x[:, 0] > 0).long()
    criterion = nn.CrossEntropyLoss()

    print("=" * 60)
    print("问题 1：学习率（Learning Rate）过高（lr=10）")
    print("=" * 60)
    model1 = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger1 = NetworkDebugger(model1)
    optimizer1 = torch.optim.SGD(model1.parameters(), lr=10.0)
    for step in range(20):
        optimizer1.zero_grad()
        out = model1(x)
        loss = criterion(out, y)
        debugger1.record_loss(loss.item())
        loss.backward()
        optimizer1.step()
    debugger1.print_report()
    debugger1.remove_hooks()

    print("\n" + "=" * 60)
    print("问题 2：不当初始化导致 ReLU 死亡（Dead ReLUs）")
    print("=" * 60)
    model2 = nn.Sequential(
        nn.Linear(10, 32),
        nn.ReLU(),
        nn.Linear(32, 32),
        nn.ReLU(),
        nn.Linear(32, 2),
    )
    with torch.no_grad():
        for m in model2.modules():
            if isinstance(m, nn.Linear):
                m.weight.fill_(-1.0)
                m.bias.fill_(-5.0)
    debugger2 = NetworkDebugger(model2)
    optimizer2 = torch.optim.Adam(model2.parameters(), lr=1e-3)
    for step in range(50):
        optimizer2.zero_grad()
        out = model2(x)
        loss = criterion(out, y)
        debugger2.record_loss(loss.item())
        loss.backward()
        optimizer2.step()
    debugger2.print_report()
    debugger2.remove_hooks()

    print("\n" + "=" * 60)
    print("问题 3：缺少 zero_grad 调用，导致梯度累积（Gradient Accumulation）")
    print("=" * 60)
    model3 = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger3 = NetworkDebugger(model3)
    optimizer3 = torch.optim.SGD(model3.parameters(), lr=0.01)
    for step in range(50):
        out = model3(x)
        loss = criterion(out, y)
        debugger3.record_loss(loss.item())
        loss.backward()
        optimizer3.step()
    debugger3.print_report()
    debugger3.remove_hooks()

    print("\n" + "=" * 60)
    print("正常网络（Healthy Network）：使用正确配置进行对照")
    print("=" * 60)
    model_good = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    debugger_good = NetworkDebugger(model_good)
    optimizer_good = torch.optim.Adam(model_good.parameters(), lr=1e-3)
    for step in range(50):
        optimizer_good.zero_grad()
        out = model_good(x)
        loss = criterion(out, y)
        debugger_good.record_loss(loss.item())
        loss.backward()
        optimizer_good.step()
    debugger_good.print_report()
    debugger_good.remove_hooks()

    print("\n" + "=" * 60)
    print("单批次过拟合测试（Overfit-One-Batch Test）")
    print("=" * 60)
    model_test = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    overfit_one_batch(model_test, x[:8], y[:8], criterion)

    print("\n" + "=" * 60)
    print("学习率查找器（Learning Rate Finder）")
    print("=" * 60)
    model_lr = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 2))
    find_learning_rate(model_lr, x, y, criterion)

    print("\n" + "=" * 60)
    print("梯度检查（Gradient Check）：使用平滑模型和均方误差（MSE）损失，以准确计算有限差分（Finite Differences）")
    print("=" * 60)
    torch.manual_seed(123)
    x_check = torch.randn(4, 3)
    y_check = torch.randn(4, 1)
    model_grad = nn.Sequential(nn.Linear(3, 4), nn.Tanh(), nn.Linear(4, 1))
    gradient_check(model_grad, x_check, y_check, nn.MSELoss())


if __name__ == "__main__":
    print("=" * 60)
    print("神经网络调试（Debugging Neural Networks）-- 阶段 3，第 13 课")
    print("=" * 60)
    demo_broken_networks()
