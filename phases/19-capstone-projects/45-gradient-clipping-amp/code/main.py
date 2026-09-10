"""梯度裁剪与混合精度训练步。

实现内容：
- clip_global_l2_norm：计算裁剪前的全局 L2 范数，必要时原地缩放梯度。
- has_non_finite_grad：检查梯度中是否含 NaN 或 Inf。
- AmpTrainState：组合 AdamW、autocast 和 GradScaler，执行带有
  非有限值检查的训练步。
- StepLog 和 SkipLog：结构化的逐步记录。

末尾演示使用小型线性网络训练 20 步，并在指定步注入非有限梯度，
验证跳过更新的路径。运行：python3 code/main.py

译注：原文称裁剪函数是 clip_grad_norm_ 的包装，实际是手工缩放；
裁剪后的返回值也未重新测量。演示默认在 CPU 上使用 bfloat16
autocast，GradScaler 被禁用；这不等于验证了 CUDA 上的动态缩放。
异常、跳过原因枚举和 CSV 字段保留原值。
"""

from __future__ import annotations

import csv
import math
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Iterable

try:
    import torch
    from torch import nn
except ImportError as exc:
    raise SystemExit(
        # 本课需要 PyTorch；安装命令：pip install torch。
        "torch is required for this lesson. Install with: pip install torch"
    ) from exc


DEFAULT_MAX_NORM = 1.0
DEFAULT_DEVICE = "cpu"
NORM_TYPE = 2.0


@dataclass
class StepLog:
    """逐步训练日志中的一行。"""

    step: int
    lr: float
    grad_l2_pre_clip: float
    grad_l2_post_clip: float
    loss: float
    skipped: bool
    skip_reason: str
    scaler_scale: float

    def to_csv_row(self) -> list[str]:
        return [
            str(self.step),
            f"{self.lr:.10f}",
            f"{self.grad_l2_pre_clip:.10f}",
            f"{self.grad_l2_post_clip:.10f}",
            f"{self.loss:.10f}",
            "1" if self.skipped else "0",
            self.skip_reason,
            f"{self.scaler_scale:.6f}",
        ]


@dataclass
class SkipLog:
    """单独记录被跳过的训练步，用于告警和事后排查。"""

    step: int
    reason: str
    pre_clip_norm: float
    loss: float
    scaler_scale: float


def has_non_finite_grad(parameters: Iterable[torch.nn.Parameter]) -> bool:
    """任意梯度含 NaN 或 Inf 时返回 True。"""

    for param in parameters:
        if param.grad is None:
            continue
        grad = param.grad.detach()
        if not torch.isfinite(grad).all().item():
            return True
    return False


def compute_global_l2_norm(parameters: Iterable[torch.nn.Parameter]) -> float:
    """计算所有梯度的欧几里得范数，不执行裁剪。"""

    squared_sum = 0.0
    for param in parameters:
        if param.grad is None:
            continue
        grad = param.grad.detach()
        squared_sum += float(grad.pow(2).sum().item())
    return math.sqrt(squared_sum)


def clip_global_l2_norm(
    parameters: list[torch.nn.Parameter],
    max_norm: float,
) -> tuple[float, float]:
    """将梯度原地裁剪到 max_norm，返回 (pre_clip, post_clip)。

    pre_clip <= max_norm 时不改变梯度，两个返回值相等；
    pre_clip > max_norm 时按 max_norm / (pre_clip + 1e-12) 缩放，
    第二个返回值直接取 max_norm。

    译注：原文将第二项说成显式测得的裁剪后范数，实际并未重新计算；
    非有限范数也直接原样返回。因此不能把返回值当作独立的裁剪验证。
    """

    if max_norm <= 0:
        # 范数上限必须为正数。
        raise ValueError("max_norm must be positive")
    pre_clip = compute_global_l2_norm(parameters)
    if not math.isfinite(pre_clip):
        return pre_clip, pre_clip
    if pre_clip <= max_norm:
        return pre_clip, pre_clip
    scale = max_norm / (pre_clip + 1e-12)
    for param in parameters:
        if param.grad is not None:
            param.grad.detach().mul_(scale)
    return pre_clip, max_norm


class AmpTrainState:
    """结合混合精度与梯度裁剪的训练步。

    绑定模型、AdamW 优化器、GradScaler 及 autocast 设备。
    step(inputs, targets) 执行：

      1. 在 autocast 中进行前向传播。
      2. 检查损失是否有限；非有限损失跳过反向传播。
      3. 通过 scaler.scale(loss) 反向传播。
      4. 调用 scaler.unscale_(optimizer) 还原梯度尺度。
      5. 检查梯度是否有限；非有限梯度跳过优化器更新。
      6. 按 max_norm 裁剪。
      7. 调用 scaler.step(optimizer) 和 scaler.update()。

    本类只为 CUDA 启用 GradScaler，也不会自动把模型和输入搬到设备。
    """

    def __init__(
        self,
        model: nn.Module,
        lr: float = 1e-2,
        max_norm: float = DEFAULT_MAX_NORM,
        device_type: str = DEFAULT_DEVICE,
        weight_decay: float = 0.01,
        amp_dtype: torch.dtype | None = None,
    ) -> None:
        if max_norm <= 0:
            # 范数上限必须为正数。
            raise ValueError("max_norm must be positive")
        if device_type not in ("cpu", "cuda"):
            # 设备类型只允许 cpu 或 cuda。
            raise ValueError(f"device_type must be 'cpu' or 'cuda', got {device_type}")
        self.model = model
        self.max_norm = max_norm
        self.device_type = device_type
        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=lr,
            weight_decay=weight_decay,
        )
        scaler_enabled = device_type == "cuda"
        self.scaler = torch.amp.GradScaler(device_type, enabled=scaler_enabled)
        if amp_dtype is None:
            amp_dtype = torch.bfloat16 if device_type == "cpu" else torch.float16
        self.amp_dtype = amp_dtype
        self.global_step = 0
        self._log: list[StepLog] = []
        self._skip_log: list[SkipLog] = []
        self._loss_fn: Callable[[torch.Tensor, torch.Tensor], torch.Tensor] = nn.functional.mse_loss

    @property
    def log(self) -> list[StepLog]:
        return list(self._log)

    @property
    def skip_log(self) -> list[SkipLog]:
        return list(self._skip_log)

    @property
    def skip_count(self) -> int:
        return len(self._skip_log)

    def set_loss_fn(self, fn: Callable[[torch.Tensor, torch.Tensor], torch.Tensor]) -> None:
        self._loss_fn = fn

    def set_lr(self, lr: float) -> None:
        for group in self.optimizer.param_groups:
            group["lr"] = lr

    def _current_lr(self) -> float:
        return float(self.optimizer.param_groups[0]["lr"])

    def step(
        self,
        inputs: torch.Tensor,
        targets: torch.Tensor,
        gradient_corruptor: Callable[[nn.Module], None] | None = None,
    ) -> StepLog:
        """执行一个训练步，可选地破坏梯度以进行测试。

        gradient_corruptor 允许演示在反向传播之后、还原缩放之前
        注入非有限梯度。普通调用保留 None；测试传入闭包，
        将某个参数的梯度改为 Inf。
        """

        self.model.train()
        self.optimizer.zero_grad(set_to_none=True)

        with torch.amp.autocast(device_type=self.device_type, dtype=self.amp_dtype):
            predictions = self.model(inputs)
            loss = self._loss_fn(predictions, targets)

        if not torch.isfinite(loss).all().item():
            # 跳过时不要调用 scaler.update()：本步尚未调用
            # scaler.scale(loss).backward()，在此调用 update()
            # 会违反 GradScaler 所要求的调用顺序。
            return self._record_skip(
                loss_value=float(loss.detach().cpu().item()),
                # non_finite_loss：损失为非有限值。
                reason="non_finite_loss",
                pre_clip=0.0,
                update_scaler=False,
            )

        self.scaler.scale(loss).backward()
        if gradient_corruptor is not None:
            gradient_corruptor(self.model)
        self.scaler.unscale_(self.optimizer)

        if has_non_finite_grad(self.model.parameters()):
            scale_before = float(self.scaler.get_scale())
            self.scaler.update()
            record = StepLog(
                step=self.global_step,
                lr=self._current_lr(),
                grad_l2_pre_clip=float("inf"),
                grad_l2_post_clip=float("inf"),
                loss=float(loss.detach().item()),
                skipped=True,
                # non_finite_grad：梯度含非有限值。
                skip_reason="non_finite_grad",
                scaler_scale=scale_before,
            )
            self._log.append(record)
            self._skip_log.append(
                SkipLog(
                    step=self.global_step,
                    # non_finite_grad：梯度含非有限值。
                    reason="non_finite_grad",
                    pre_clip_norm=float("inf"),
                    loss=float(loss.detach().item()),
                    scaler_scale=scale_before,
                )
            )
            self.global_step += 1
            return record

        pre_clip, post_clip = clip_global_l2_norm(list(self.model.parameters()), self.max_norm)

        self.scaler.step(self.optimizer)
        self.scaler.update()
        record = StepLog(
            step=self.global_step,
            lr=self._current_lr(),
            grad_l2_pre_clip=pre_clip,
            grad_l2_post_clip=post_clip,
            loss=float(loss.detach().item()),
            skipped=False,
            skip_reason="",
            scaler_scale=float(self.scaler.get_scale()),
        )
        self._log.append(record)
        self.global_step += 1
        return record

    def _record_skip(
        self,
        loss_value: float,
        reason: str,
        pre_clip: float,
        update_scaler: bool = True,
    ) -> StepLog:
        record = StepLog(
            step=self.global_step,
            lr=self._current_lr(),
            grad_l2_pre_clip=pre_clip,
            grad_l2_post_clip=pre_clip,
            loss=loss_value,
            skipped=True,
            skip_reason=reason,
            scaler_scale=float(self.scaler.get_scale()),
        )
        self._log.append(record)
        self._skip_log.append(
            SkipLog(
                step=self.global_step,
                reason=reason,
                pre_clip_norm=pre_clip,
                loss=loss_value,
                scaler_scale=float(self.scaler.get_scale()),
            )
        )
        self.global_step += 1
        if update_scaler:
            self.scaler.update()
        return record


def rolling_skip_rate(log: Iterable[StepLog], window: int = 1000) -> list[float]:
    """对每一步，返回最近 window 步内的滚动跳过比例。"""

    if window <= 0:
        # 滚动窗口长度必须为正数。
        raise ValueError("window must be positive")
    rows = list(log)
    rates: list[float] = []
    skipped: list[int] = []
    for row in rows:
        skipped.append(1 if row.skipped else 0)
        if len(skipped) > window:
            skipped = skipped[-window:]
        rates.append(sum(skipped) / len(skipped))
    return rates


def write_step_log_csv(log: Iterable[StepLog], path: Path) -> None:
    """按固定格式写出训练步 CSV。

    列名保留为：step、lr、grad_l2_pre_clip、grad_l2_post_clip、loss、
    skipped、skip_reason、scaler_scale，分别表示步数、学习率、裁剪前后
    梯度范数、损失、是否跳过、跳过原因和缩放因子。
    """

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "step",
                "lr",
                "grad_l2_pre_clip",
                "grad_l2_post_clip",
                "loss",
                "skipped",
                "skip_reason",
                "scaler_scale",
            ]
        )
        for row in log:
            writer.writerow(row.to_csv_row())


def build_toy_model(
    in_dim: int = 16,
    out_dim: int = 4,
    seed: int = 7,
) -> tuple[nn.Module, torch.Tensor, torch.Tensor]:
    torch.manual_seed(seed)
    model = nn.Sequential(nn.Linear(in_dim, 32), nn.GELU(), nn.Linear(32, out_dim))
    inputs = torch.randn(8, in_dim)
    targets = torch.randn(8, out_dim)
    return model, inputs, targets


def inject_inf_into_first_grad(model: nn.Module) -> None:
    """仅用于测试：将首个有梯度的参数的梯度写为 +Inf。"""

    for param in model.parameters():
        if param.grad is not None:
            param.grad.data[...] = float("inf")
            return


def run_demo() -> int:
    """训练 20 步，并在已知的某一步注入非有限梯度。"""

    model, inputs, targets = build_toy_model()
    state = AmpTrainState(model=model, lr=1e-2, max_norm=1.0, device_type="cpu")
    for index in range(20):
        corruptor: Callable[[nn.Module], None] | None = None
        if index == 5:
            corruptor = inject_inf_into_first_grad
        record = state.step(inputs, targets, gradient_corruptor=corruptor)
        marker = "跳过" if record.skipped else "更新"
        print(
            f"{marker} 步数={record.step:>3} 学习率={record.lr:.6f} "
            f"裁剪前={record.grad_l2_pre_clip:>10.6f} "
            f"裁剪后={record.grad_l2_post_clip:>10.6f} "
            f"损失={record.loss:.6f} 缩放={record.scaler_scale:.1f} "
            f"原因={record.skip_reason or '-'}"
        )
    print()
    print(
        f"跳过次数={state.skip_count} "
        f"最终滚动跳过率={rolling_skip_rate(state.log, window=10)[-1]:.4f}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
