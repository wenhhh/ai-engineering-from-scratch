"""替换输出头，进行分类器微调。

参见：phases/19-capstone-projects/38-classifier-finetuning/docs/en.md

在合成的垃圾／正常短信夹具上比较两种策略：
- 仅训练分类头：冻结主干，只训练线性分类头。
- 全参数微调：主干与分类头都参与训练。

演示先短暂训练微型 Transformer 主干，再分别微调并输出精确率、召回率、F1 和混淆矩阵。
达到本例设定的 F1 门槛时退出码为 0。

译注：预训练步骤虽然使用下一词元标签，主干却只有填充掩码，没有因果掩码，
能够看到后续词元，不能当作严格自回归语言模型预训练。两种策略复制相同主干，
但分类头初始化及学习率不相同；比较并非只改变“是否冻结”的单变量实验。
数据来自固定模板并按样本划分，未保证训练／测试模板互斥。F1 > 0.5 是示例门槛，
并不是所有类别分布或随机预测策略下统一的基线。英文语料参与字节编码，保留原值。
"""

from __future__ import annotations

import math
import random
import sys
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset


# ---------------------------------------------------------------------------
# 分词器
# ---------------------------------------------------------------------------


class ByteTokenizer:
    """将 UTF-8 字节映射为 0..255 的 ID，另以 256 作为 PAD；不局限于可打印字节。"""

    PAD_ID = 256
    VOCAB = 260  # 为以后增加特殊词元预留空间

    def encode(self, text: str, max_len: int) -> Tuple[List[int], List[int]]:
        """返回 (ids, attention_mask)，截断或填充到 max_len。"""
        raw = list(text.encode("utf-8", errors="ignore"))[:max_len]
        attn = [1] * len(raw)
        while len(raw) < max_len:
            raw.append(self.PAD_ID)
            attn.append(0)
        return raw, attn

    def decode(self, ids: Sequence[int]) -> str:
        return bytes(i for i in ids if i < 256).decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# 微型 Transformer 主干
# ---------------------------------------------------------------------------


class MultiHeadAttention(nn.Module):
    def __init__(self, hidden: int, heads: int):
        super().__init__()
        if hidden % heads != 0:
            raise ValueError("hidden must divide by heads")
        self.heads = heads
        self.head_dim = hidden // heads
        self.qkv = nn.Linear(hidden, hidden * 3, bias=False)
        self.out = nn.Linear(hidden, hidden, bias=False)

    def forward(self, x: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        B, T, D = x.shape
        qkv = self.qkv(x).view(B, T, 3, self.heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        # mask 形状为 B×T：实际词元为 1，填充为 0；广播到 B×1×1×T。
        m = mask.view(B, 1, 1, T).to(att.dtype)
        att = att.masked_fill(m == 0, float("-inf"))
        weights = F.softmax(att, dim=-1)
        # 将全为填充键等情况产生的 NaN 行替换为零。
        weights = torch.nan_to_num(weights, nan=0.0)
        ctx = (weights @ v).transpose(1, 2).contiguous().view(B, T, D)
        return self.out(ctx)


class FeedForward(nn.Module):
    def __init__(self, hidden: int, mlp_ratio: int = 4):
        super().__init__()
        self.fc1 = nn.Linear(hidden, hidden * mlp_ratio)
        self.fc2 = nn.Linear(hidden * mlp_ratio, hidden)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc2(F.gelu(self.fc1(x)))


class Block(nn.Module):
    def __init__(self, hidden: int, heads: int):
        super().__init__()
        self.ln1 = nn.LayerNorm(hidden)
        self.attn = MultiHeadAttention(hidden, heads)
        self.ln2 = nn.LayerNorm(hidden)
        self.ff = FeedForward(hidden)

    def forward(self, x: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x), mask)
        x = x + self.ff(self.ln2(x))
        return x


class LMBody(nn.Module):
    """词元嵌入 + 位置嵌入 + N 个 Transformer 块，返回隐藏状态；本主干不使用因果掩码。"""

    def __init__(self, vocab: int, hidden: int, heads: int, depth: int, max_len: int):
        super().__init__()
        self.tok = nn.Embedding(vocab, hidden)
        self.pos = nn.Embedding(max_len, hidden)
        self.blocks = nn.ModuleList([Block(hidden, heads) for _ in range(depth)])
        self.ln_f = nn.LayerNorm(hidden)
        self.max_len = max_len

    def forward(self, ids: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        B, T = ids.shape
        positions = torch.arange(T, device=ids.device).unsqueeze(0).expand(B, T)
        x = self.tok(ids) + self.pos(positions)
        for block in self.blocks:
            x = block(x, mask)
        return self.ln_f(x)


# ---------------------------------------------------------------------------
# 池化与分类头
# ---------------------------------------------------------------------------


def mean_pool(hidden: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    """沿序列维度求掩码加权平均值。"""
    m = mask.unsqueeze(-1).to(hidden.dtype)
    summed = (hidden * m).sum(dim=1)
    counts = m.sum(dim=1).clamp(min=1.0)
    return summed / counts


class Classifier(nn.Module):
    def __init__(self, body: LMBody, num_classes: int = 2):
        super().__init__()
        self.body = body
        hidden = body.ln_f.normalized_shape[0]
        self.head = nn.Linear(hidden, num_classes)

    def forward(self, ids: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        h = self.body(ids, mask)
        pooled = mean_pool(h, mask)
        return self.head(pooled)


class LMHead(nn.Module):
    """词元预测输出头，用于短暂的预训练演示。"""

    def __init__(self, body: LMBody, vocab: int):
        super().__init__()
        self.body = body
        hidden = body.ln_f.normalized_shape[0]
        self.proj = nn.Linear(hidden, vocab, bias=False)

    def forward(self, ids: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        h = self.body(ids, mask)
        return self.proj(h)


# ---------------------------------------------------------------------------
# 冻结与解冻
# ---------------------------------------------------------------------------


def freeze_body(model: Classifier) -> int:
    """将主干参数的 requires_grad 设为 False，返回冻结的参数张量个数，不是标量参数总量。"""
    n = 0
    for p in model.body.parameters():
        p.requires_grad = False
        n += 1
    return n


def unfreeze_body(model: Classifier) -> int:
    n = 0
    for p in model.body.parameters():
        p.requires_grad = True
        n += 1
    return n


def trainable_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


# ---------------------------------------------------------------------------
# 合成垃圾／正常短信夹具；下列英文模板保留为训练输入
# ---------------------------------------------------------------------------


SPAM_TEMPLATES = [
    "FREE entry in {n}wkly comp to win FA Cup",
    "URGENT call {phone} to claim your prize",
    "WINNER claim your {amount} pound award now",
    "Congrats you won {prize} reply YES",
    "Click {url} for {discount} percent off",
    "Cheap loans available call {phone}",
    "Hot singles in {city} text NOW",
    "Earn money working from home click {url}",
    "You have been selected for a {amount} pound voucher",
    "Limited offer reply STOP to opt out",
]

HAM_TEMPLATES = [
    "are you home for dinner tonight",
    "see you at {time} tomorrow",
    "can you pick up {item} on the way",
    "the meeting moved to {time}",
    "thanks for the {item} yesterday",
    "let me know when you are free",
    "running late by {n} minutes sorry",
    "have a good day at work",
    "did you watch the match last night",
    "happy birthday hope you have fun",
]

SLOTS = {
    "n": ["1", "2", "3", "5", "10"],
    "phone": ["09061701461", "08000839402", "09058091870"],
    "amount": ["100", "250", "500", "1000", "5000"],
    "prize": ["a holiday", "an iPhone", "a laptop", "cash"],
    "url": ["http://bit.ly/free", "http://win.now/cash", "http://promo.io"],
    "discount": ["20", "30", "50", "70"],
    "city": ["London", "Manchester", "Leeds", "Bristol"],
    "time": ["6pm", "7pm", "noon", "9am"],
    "item": ["milk", "bread", "the kids", "the dog", "groceries"],
}


def fill(template: str, rng: random.Random) -> str:
    out = template
    for key, options in SLOTS.items():
        marker = "{" + key + "}"
        if marker in out:
            out = out.replace(marker, rng.choice(options))
    return out


def make_dataset(n_per_class: int = 400, seed: int = 0) -> Tuple[List[str], List[int]]:
    rng = random.Random(seed)
    texts: List[str] = []
    labels: List[int] = []
    for _ in range(n_per_class):
        texts.append(fill(rng.choice(SPAM_TEMPLATES), rng))
        labels.append(1)
        texts.append(fill(rng.choice(HAM_TEMPLATES), rng))
        labels.append(0)
    # 使用既定随机数生成器打乱顺序。
    order = list(range(len(texts)))
    rng.shuffle(order)
    return [texts[i] for i in order], [labels[i] for i in order]


def stratified_split(
    texts: Sequence[str], labels: Sequence[int], test_frac: float, seed: int
) -> Tuple[List[str], List[int], List[str], List[int]]:
    rng = random.Random(seed)
    by_label: dict[int, List[int]] = {}
    for idx, y in enumerate(labels):
        by_label.setdefault(y, []).append(idx)
    train_idx: List[int] = []
    test_idx: List[int] = []
    for y, idxs in by_label.items():
        idxs_copy = list(idxs)
        rng.shuffle(idxs_copy)
        cut = int(len(idxs_copy) * (1.0 - test_frac))
        train_idx.extend(idxs_copy[:cut])
        test_idx.extend(idxs_copy[cut:])
    rng.shuffle(train_idx)
    rng.shuffle(test_idx)
    return (
        [texts[i] for i in train_idx],
        [labels[i] for i in train_idx],
        [texts[i] for i in test_idx],
        [labels[i] for i in test_idx],
    )


# ---------------------------------------------------------------------------
# 数据集
# ---------------------------------------------------------------------------


class ClassificationDataset(Dataset):
    def __init__(self, texts: Sequence[str], labels: Sequence[int], tok: ByteTokenizer, max_len: int):
        self.texts = list(texts)
        self.labels = list(labels)
        self.tok = tok
        self.max_len = max_len

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int):
        ids, mask = self.tok.encode(self.texts[idx], self.max_len)
        return (
            torch.tensor(ids, dtype=torch.long),
            torch.tensor(mask, dtype=torch.long),
            torch.tensor(self.labels[idx], dtype=torch.long),
        )


class LMDataset(Dataset):
    """基于垃圾／正常短信的词元数据集，用于预训练演示；数据集本身不会保证主干注意力的因果性。"""

    def __init__(self, texts: Sequence[str], tok: ByteTokenizer, max_len: int):
        self.texts = list(texts)
        self.tok = tok
        self.max_len = max_len

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int):
        ids, mask = self.tok.encode(self.texts[idx], self.max_len)
        return (
            torch.tensor(ids, dtype=torch.long),
            torch.tensor(mask, dtype=torch.long),
        )


# ---------------------------------------------------------------------------
# 训练循环
# ---------------------------------------------------------------------------


def pretrain_quick(
    body: LMBody,
    tok: ByteTokenizer,
    texts: Sequence[str],
    max_len: int,
    epochs: int = 5,
    batch_size: int = 32,
    lr: float = 3e-3,
    seed: int = 0,
) -> List[float]:
    """短暂训练词元预测任务，让主干权重经历更新；注意该主干能读取后续词元。"""
    torch.manual_seed(seed)
    head = LMHead(body, vocab=tok.VOCAB)
    ds = LMDataset(texts, tok, max_len)
    dl = DataLoader(ds, batch_size=batch_size, shuffle=True)
    opt = torch.optim.Adam(head.parameters(), lr=lr)
    losses: List[float] = []
    head.train()
    for _ in range(epochs):
        epoch_loss = 0.0
        n_batches = 0
        for ids, mask in dl:
            logits = head(ids, mask)
            # 错开一个位置，构造下一词元预测标签。
            target = ids[:, 1:].contiguous()
            tgt_mask = mask[:, 1:].contiguous()
            logits = logits[:, :-1, :].contiguous()
            loss_full = F.cross_entropy(
                logits.view(-1, logits.size(-1)),
                target.view(-1),
                reduction="none",
            )
            loss_full = loss_full.view(target.shape) * tgt_mask
            denom = tgt_mask.sum().clamp(min=1.0)
            loss = loss_full.sum() / denom
            opt.zero_grad()
            loss.backward()
            opt.step()
            epoch_loss += float(loss.item())
            n_batches += 1
        losses.append(epoch_loss / max(n_batches, 1))
    return losses


@dataclass
class TrainReport:
    losses: List[float]
    final_loss: float
    trainable: int


def train_classifier(
    model: Classifier,
    train_loader: DataLoader,
    epochs: int,
    lr: float,
    seed: int,
) -> TrainReport:
    torch.manual_seed(seed)
    params = [p for p in model.parameters() if p.requires_grad]
    if not params:
        raise ValueError("No trainable parameters. Did you freeze the head as well?")
    opt = torch.optim.Adam(params, lr=lr)
    losses: List[float] = []
    model.train()
    for _ in range(epochs):
        epoch_loss = 0.0
        n_batches = 0
        for ids, mask, y in train_loader:
            logits = model(ids, mask)
            loss = F.cross_entropy(logits, y)
            opt.zero_grad()
            loss.backward()
            opt.step()
            epoch_loss += float(loss.item())
            n_batches += 1
        losses.append(epoch_loss / max(n_batches, 1))
    return TrainReport(losses=losses, final_loss=losses[-1], trainable=trainable_params(model))


# ---------------------------------------------------------------------------
# 评估
# ---------------------------------------------------------------------------


@dataclass
class Metrics:
    precision: float
    recall: float
    f1: float
    tp: int
    fp: int
    fn: int
    tn: int

    def confusion(self) -> str:
        return (
            "                预测正常   预测垃圾\n"
            f"  实际正常      {self.tn:>8d}   {self.fp:>8d}\n"
            f"  实际垃圾      {self.fn:>8d}   {self.tp:>8d}"
        )


def precision_recall_f1(tp: int, fp: int, fn: int) -> Tuple[float, float, float]:
    p = tp / (tp + fp) if (tp + fp) else 0.0
    r = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * p * r) / (p + r) if (p + r) else 0.0
    return p, r, f1


@torch.no_grad()
def evaluate(model: Classifier, loader: DataLoader, positive: int = 1) -> Metrics:
    model.eval()
    tp = fp = fn = tn = 0
    for ids, mask, y in loader:
        logits = model(ids, mask)
        pred = logits.argmax(dim=-1)
        for p_i, y_i in zip(pred.tolist(), y.tolist()):
            if p_i == positive and y_i == positive:
                tp += 1
            elif p_i == positive and y_i != positive:
                fp += 1
            elif p_i != positive and y_i == positive:
                fn += 1
            else:
                tn += 1
    p, r, f1 = precision_recall_f1(tp, fp, fn)
    return Metrics(precision=p, recall=r, f1=f1, tp=tp, fp=fp, fn=fn, tn=tn)


# ---------------------------------------------------------------------------
# 配置与演示
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Config:
    vocab: int = ByteTokenizer.VOCAB
    hidden: int = 64
    heads: int = 4
    depth: int = 2
    max_len: int = 32
    batch_size: int = 32
    head_only_epochs: int = 20
    full_ft_epochs: int = 20
    head_lr: float = 5e-3
    full_lr: float = 1e-3
    pretrain_epochs: int = 5
    seed: int = 0


def build_model(cfg: Config) -> Classifier:
    torch.manual_seed(cfg.seed)
    body = LMBody(
        vocab=cfg.vocab,
        hidden=cfg.hidden,
        heads=cfg.heads,
        depth=cfg.depth,
        max_len=cfg.max_len,
    )
    return Classifier(body, num_classes=2)


@dataclass
class DemoReport:
    head_only: Metrics
    full_ft: Metrics
    head_only_loss: float
    full_ft_loss: float
    head_only_trainable: int
    full_ft_trainable: int

    def passed(self) -> bool:
        # 检查两种策略是否都超过此夹具设定的 F1 > 0.5 门槛；不是通用随机基线。
        return self.head_only.f1 > 0.5 and self.full_ft.f1 > 0.5


def run_demo(cfg: Config | None = None) -> int:
    cfg = cfg or Config()
    torch.manual_seed(cfg.seed)
    np.random.seed(cfg.seed)

    tok = ByteTokenizer()
    texts, labels = make_dataset(n_per_class=400, seed=cfg.seed)
    tr_t, tr_y, te_t, te_y = stratified_split(texts, labels, test_frac=0.2, seed=cfg.seed)

    train_ds = ClassificationDataset(tr_t, tr_y, tok, cfg.max_len)
    test_ds = ClassificationDataset(te_t, te_y, tok, cfg.max_len)
    train_dl = DataLoader(train_ds, batch_size=cfg.batch_size, shuffle=True)
    test_dl = DataLoader(test_ds, batch_size=cfg.batch_size, shuffle=False)

    print("分类器微调演示")
    print(f"训练样本数={len(train_ds)} 测试样本数={len(test_ds)} 最大长度={cfg.max_len}")
    print("")
    print("[1/3] 使用语料短暂训练主干……")
    body_for_pretrain = LMBody(
        vocab=cfg.vocab,
        hidden=cfg.hidden,
        heads=cfg.heads,
        depth=cfg.depth,
        max_len=cfg.max_len,
    )
    pre_losses = pretrain_quick(
        body_for_pretrain,
        tok,
        tr_t,
        cfg.max_len,
        epochs=cfg.pretrain_epochs,
        batch_size=cfg.batch_size,
        seed=cfg.seed,
    )
    print(f"      预训练末轮损失 = {pre_losses[-1]:.4f}")

    # 两个分类器复制相同的预训练主干权重，避免后续训练互相修改；分类头另行初始化。
    head_only_model = Classifier(_clone_body(body_for_pretrain), num_classes=2)
    full_ft_model = Classifier(_clone_body(body_for_pretrain), num_classes=2)

    print("")
    print("[2/3] 仅训练分类头，主干冻结……")
    freeze_body(head_only_model)
    head_report = train_classifier(
        head_only_model,
        train_dl,
        epochs=cfg.head_only_epochs,
        lr=cfg.head_lr,
        seed=cfg.seed,
    )
    head_metrics = evaluate(head_only_model, test_dl)
    print(f"      可训练参数量 = {head_report.trainable}")
    print(f"      最终训练损失 = {head_report.final_loss:.4f}")
    print(f"      精确率 P={head_metrics.precision:.3f} 召回率 R={head_metrics.recall:.3f} F1={head_metrics.f1:.3f}")
    print(head_metrics.confusion())

    print("")
    print("[3/3] 全参数微调，主干解冻……")
    unfreeze_body(full_ft_model)
    full_report = train_classifier(
        full_ft_model,
        train_dl,
        epochs=cfg.full_ft_epochs,
        lr=cfg.full_lr,
        seed=cfg.seed,
    )
    full_metrics = evaluate(full_ft_model, test_dl)
    print(f"      可训练参数量 = {full_report.trainable}")
    print(f"      最终训练损失 = {full_report.final_loss:.4f}")
    print(f"      精确率 P={full_metrics.precision:.3f} 召回率 R={full_metrics.recall:.3f} F1={full_metrics.f1:.3f}")
    print(full_metrics.confusion())

    report = DemoReport(
        head_only=head_metrics,
        full_ft=full_metrics,
        head_only_loss=head_report.final_loss,
        full_ft_loss=full_report.final_loss,
        head_only_trainable=head_report.trainable,
        full_ft_trainable=full_report.trainable,
    )

    print("")
    print("汇总")
    print(f"  仅训练分类头：可训练参数={report.head_only_trainable:>6d} F1={report.head_only.f1:.3f}")
    print(f"  全参数微调：  可训练参数={report.full_ft_trainable:>6d} F1={report.full_ft.f1:.3f}")
    if not report.passed():
        # 错误契约保留原文；准确含义是至少一种策略未超过示例的 F1=0.5 门槛。
        print("ERROR: at least one regime did not beat random F1=0.5", file=sys.stderr)
        return 1
    return 0


def _clone_body(body: LMBody) -> LMBody:
    """复制主干，使两种微调策略从相同的主干权重开始；不保证新建分类头初始化相同。"""
    clone = LMBody(
        vocab=body.tok.num_embeddings,
        hidden=body.ln_f.normalized_shape[0],
        heads=body.blocks[0].attn.heads,
        depth=len(body.blocks),
        max_len=body.max_len,
    )
    clone.load_state_dict(body.state_dict())
    return clone


if __name__ == "__main__":
    sys.exit(run_demo())
