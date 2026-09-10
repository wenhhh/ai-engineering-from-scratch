"""从零实现直接偏好优化（DPO）。

参见：phases/19-capstone-projects/40-dpo-from-scratch/docs/en.md

包含字节级指令分词器、因果 TinyGPT、(prompt, chosen, rejected) 偏好三元组，
只对回答部分累计下一词元对数概率的 sequence_log_prob，以及以下 DPO 损失：
    L = -log sigmoid(beta * ((logp_w_pol - logp_w_ref)
                           - (logp_l_pol - logp_l_ref)))
训练循环使用冻结的参考模型和可训练的策略模型，并逐轮打印损失及间隔。

译注：预热和偏好训练都在同一组 12 条固定夹具上进行，没有独立留出评估；
预热损失包含提示和优选回答，不只计算回答。优选回答普遍较短，原始序列对数概率
受长度影响，间隔增大不能直接等同于回答质量或真实偏好能力提升。
逐轮 margin 是相对参考模型校正后、尚未乘 beta 的差值；初末 margin 是策略模型
自身的 chosen-rejected 原始对数概率差，两者不是同一口径。
默认成功条件同时要求初末原始间隔增大和首末轮损失下降。所有英文夹具保留原值。
"""

from __future__ import annotations

import math
import random
import sys
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# 分词器
# ---------------------------------------------------------------------------


class InstructionTokenizer:
    INST_ID = 256
    RESP_ID = 257
    PAD_ID = 258
    VOCAB = 260

    def encode_prompt(self, prompt: str) -> List[int]:
        ids = [self.INST_ID]
        ids.extend(prompt.encode("utf-8", errors="ignore"))
        ids.append(self.RESP_ID)
        return ids

    def encode_completion(self, completion: str) -> List[int]:
        return list(completion.encode("utf-8", errors="ignore"))


# ---------------------------------------------------------------------------
# 微型 GPT
# ---------------------------------------------------------------------------


class CausalSelfAttention(nn.Module):
    def __init__(self, hidden: int, heads: int, max_len: int):
        super().__init__()
        if hidden % heads != 0:
            raise ValueError("hidden must divide heads")
        self.heads = heads
        self.head_dim = hidden // heads
        self.qkv = nn.Linear(hidden, hidden * 3, bias=False)
        self.out = nn.Linear(hidden, hidden, bias=False)
        mask = torch.tril(torch.ones(max_len, max_len, dtype=torch.bool))
        self.register_buffer("causal_mask", mask, persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, D = x.shape
        qkv = self.qkv(x).view(B, T, 3, self.heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        causal = self.causal_mask[:T, :T].view(1, 1, T, T)
        att = att.masked_fill(~causal, float("-inf"))
        weights = F.softmax(att, dim=-1)
        ctx = (weights @ v).transpose(1, 2).contiguous().view(B, T, D)
        return self.out(ctx)


class Block(nn.Module):
    def __init__(self, hidden: int, heads: int, max_len: int):
        super().__init__()
        self.ln1 = nn.LayerNorm(hidden)
        self.attn = CausalSelfAttention(hidden, heads, max_len)
        self.ln2 = nn.LayerNorm(hidden)
        self.fc1 = nn.Linear(hidden, hidden * 4)
        self.fc2 = nn.Linear(hidden * 4, hidden)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x))
        h = self.ln2(x)
        return x + self.fc2(F.gelu(self.fc1(h)))


class TinyGPT(nn.Module):
    def __init__(self, vocab: int, hidden: int, heads: int, depth: int, max_len: int):
        super().__init__()
        self.tok = nn.Embedding(vocab, hidden)
        self.pos = nn.Embedding(max_len, hidden)
        self.blocks = nn.ModuleList([Block(hidden, heads, max_len) for _ in range(depth)])
        self.ln_f = nn.LayerNorm(hidden)
        self.head = nn.Linear(hidden, vocab, bias=False)
        self.max_len = max_len

    def forward(self, ids: torch.Tensor) -> torch.Tensor:
        B, T = ids.shape
        positions = torch.arange(T, device=ids.device).unsqueeze(0).expand(B, T)
        x = self.tok(ids) + self.pos(positions)
        for blk in self.blocks:
            x = blk(x)
        return self.head(self.ln_f(x))


# ---------------------------------------------------------------------------
# 偏好夹具：英文提示与回答保留为固定训练输入
# ---------------------------------------------------------------------------


def make_preferences() -> List[Dict[str, str]]:
    """覆盖简单任务类型的 12 组偏好三元组；既用于训练，也用于演示中的间隔检查。"""
    return [
        {
            "prompt": "What is the capital of France?",
            "chosen": "Paris.",
            "rejected": "France is in Europe and has many beautiful cities including Paris.",
        },
        {
            "prompt": "What is the capital of Japan?",
            "chosen": "Tokyo.",
            "rejected": "Japan is an island nation. Its government sits in Tokyo.",
        },
        {
            "prompt": "What is the capital of Spain?",
            "chosen": "Madrid.",
            "rejected": "Spain has many cities. Madrid is the largest of them.",
        },
        {
            "prompt": "Compute 2 + 3.",
            "chosen": "5.",
            "rejected": "Let me think. 2 plus 3 is something close to 5 I believe.",
        },
        {
            "prompt": "Compute 7 * 6.",
            "chosen": "42.",
            "rejected": "7 multiplied by 6 gives a number around the forties.",
        },
        {
            "prompt": "Compute 12 / 4.",
            "chosen": "3.",
            "rejected": "Twelve divided by four is roughly three or so.",
        },
        {
            "prompt": "List three colors.",
            "chosen": "red, green, blue.",
            "rejected": "Colors are everywhere. Some of them are red, green, and there is blue too.",
        },
        {
            "prompt": "List three vowels.",
            "chosen": "a, e, i.",
            "rejected": "Vowels are letters that produce open mouth sounds, like a and e and also i.",
        },
        {
            "prompt": "Define variable.",
            "chosen": "a name bound to a value.",
            "rejected": "A variable is a thing that you can use in programming to store stuff.",
        },
        {
            "prompt": "Define function.",
            "chosen": "a reusable block of code that returns an output.",
            "rejected": "A function is basically something that does things when you call it on inputs.",
        },
        {
            "prompt": "Python: print 42.",
            "chosen": "print(42)",
            "rejected": "You can print numbers in python. For 42 you would call print on it.",
        },
        {
            "prompt": "Python: sort items.",
            "chosen": "items.sort()",
            "rejected": "Sorting a list in python is easy, just call sort on the items list.",
        },
    ]


# ---------------------------------------------------------------------------
# 对数概率计算
# ---------------------------------------------------------------------------


def sequence_log_prob(
    model: TinyGPT,
    prompt_ids: Sequence[int],
    completion_ids: Sequence[int],
) -> torch.Tensor:
    """累计以提示为条件的回答词元对数概率，返回与模型同设备的零维张量。

    拼接提示与回答，执行前向传播并计算 log-softmax；在回答位置收集
    log p(token[i] | token[:i]) 后求和。超过模型长度时从左侧截断。
    如果截断后提示长度为零，首个保留词元没有前文，因此不计其对数概率。
    """
    if len(completion_ids) == 0:
        return torch.zeros((), device=next(model.parameters()).device)
    full = list(prompt_ids) + list(completion_ids)
    if len(full) > model.max_len:
        # 从左侧截断，保留最近的上下文。
        full = full[-model.max_len :]
        prompt_len = max(0, len(full) - len(completion_ids))
    else:
        prompt_len = len(prompt_ids)
    ids = torch.tensor([full], dtype=torch.long, device=next(model.parameters()).device)
    logits = model(ids)
    log_probs = F.log_softmax(logits, dim=-1)
    # 第 i 个位置预测词元 i+1；回答位于索引区间 [prompt_len, len(full))。
    # 对该区间内的 k，需要 log p(第 k 个词元 | 截至 k-1 的词元)。
    # 对应值为 log_probs[0, k-1, token_k]。
    completion_targets = torch.tensor(full[prompt_len:], dtype=torch.long, device=ids.device)
    pred_positions = torch.arange(prompt_len - 1, len(full) - 1, device=ids.device)
    # 处理 prompt_len == 0 的退化情况，跳过缺少前文的首个词元。
    if prompt_len == 0:
        pred_positions = torch.arange(0, len(full) - 1, device=ids.device)
        completion_targets = torch.tensor(full[1:], dtype=torch.long, device=ids.device)
    gathered = log_probs[0, pred_positions, completion_targets]
    return gathered.sum()


def dpo_loss(
    logp_w_pol: torch.Tensor,
    logp_l_pol: torch.Tensor,
    logp_w_ref: torch.Tensor,
    logp_l_ref: torch.Tensor,
    beta: float,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """单样本 DPO 损失及尚未乘 beta 的相对对数概率间隔。

    L = -log sigmoid(beta * ((logp_w_pol - logp_w_ref) - (logp_l_pol - logp_l_ref)))

    返回 (loss_scalar, reward_margin)。代码中的 reward_margin 是未缩放的对数比差值，
    beta 非零时等于 sigmoid 自变量 / beta。若把隐式奖励定义为 beta 乘对数比，奖励差还需乘 beta。
    """
    diff_w = logp_w_pol - logp_w_ref
    diff_l = logp_l_pol - logp_l_ref
    margin = diff_w - diff_l
    z = beta * margin
    # 使用数值稳定的 logsigmoid；本例损失为单样本标量。
    loss = -F.logsigmoid(z)
    return loss, margin


def ipo_loss(
    logp_w_pol: torch.Tensor,
    logp_l_pol: torch.Tensor,
    logp_w_ref: torch.Tensor,
    logp_l_ref: torch.Tensor,
    beta: float,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """IPO 的平方损失变体。

    L_IPO = (((logp_w_pol - logp_w_ref) - (logp_l_pol - logp_l_ref)) - 1/(2*beta)) ** 2

    正 beta 时目标间隔为 1/(2*beta)。代码对非正 beta 使用零目标回退，未做参数拒绝。
    默认演示使用 DPO；配套测试另检查 IPO 的非负性与目标点。
    """
    diff_w = logp_w_pol - logp_w_ref
    diff_l = logp_l_pol - logp_l_ref
    margin = diff_w - diff_l
    target = 1.0 / (2.0 * beta) if beta > 0 else 0.0
    loss = (margin - target) ** 2
    return loss, margin


def length_normalised_log_prob(
    model: TinyGPT,
    prompt_ids: Sequence[int],
    completion_ids: Sequence[int],
) -> torch.Tensor:
    """将序列对数概率除以原始回答词元数量，用于观察长度敏感性。

    长度归一化间隔与原始间隔的符号不同，说明当前比较受长度处理影响。
    注意分母仍是截断前回答长度，不一定等于实际参与对数概率求和的词元数。
    """
    if len(completion_ids) == 0:
        return torch.zeros((), device=next(model.parameters()).device)
    raw = sequence_log_prob(model, prompt_ids, completion_ids)
    return raw / float(len(completion_ids))


@dataclass(frozen=True)
class MarginRow:
    prompt: str
    chosen: str
    rejected: str
    margin: float
    chosen_logprob: float
    rejected_logprob: float


def margin_table(
    policy: TinyGPT,
    tok: InstructionTokenizer,
    triples: Sequence[Dict[str, str]],
) -> List[MarginRow]:
    """逐条输出策略模型自身的 chosen-rejected 对数概率差，便于调试。"""
    rows: List[MarginRow] = []
    with torch.no_grad():
        for tri in triples:
            prompt = tok.encode_prompt(tri["prompt"])
            chosen = tok.encode_completion(tri["chosen"])
            rejected = tok.encode_completion(tri["rejected"])
            lp_w = sequence_log_prob(policy, prompt, chosen).item()
            lp_l = sequence_log_prob(policy, prompt, rejected).item()
            rows.append(
                MarginRow(
                    prompt=tri["prompt"],
                    chosen=tri["chosen"],
                    rejected=tri["rejected"],
                    margin=lp_w - lp_l,
                    chosen_logprob=lp_w,
                    rejected_logprob=lp_l,
                )
            )
    return rows


def print_margin_table(rows: Sequence[MarginRow], log: Callable[[str], None] = print) -> None:
    log("  间隔     优选对数概率  非优选对数概率  提示")
    log("  -------  ----------  ------------  -------------------------")
    for row in rows:
        log(
            f"  {row.margin:+.4f}   {row.chosen_logprob:+.4f}    {row.rejected_logprob:+.4f}     {row.prompt[:35]}"
        )


# ---------------------------------------------------------------------------
# 参考模型与策略模型管理
# ---------------------------------------------------------------------------


@dataclass
class DPOConfig:
    vocab: int = InstructionTokenizer.VOCAB
    hidden: int = 64
    heads: int = 4
    depth: int = 2
    max_len: int = 96
    beta: float = 0.2
    lr: float = 1e-3
    epochs: int = 30
    seed: int = 0
    warmup_epochs: int = 8  # 短暂预训练参考模型，使其对数概率经历更新


def build_models(cfg: DPOConfig) -> Tuple[TinyGPT, TinyGPT]:
    """建立参考模型和策略模型，使策略从参考模型的状态字典开始。

    构造后冻结参考模型；DPO 训练只更新策略。默认演示会为短暂预热主动解冻参考模型，
    随后再次复制状态并重新冻结。
    """
    torch.manual_seed(cfg.seed)
    reference = TinyGPT(cfg.vocab, cfg.hidden, cfg.heads, cfg.depth, cfg.max_len)
    torch.manual_seed(cfg.seed)  # 重设种子，使策略在训练前使用相同初始化
    policy = TinyGPT(cfg.vocab, cfg.hidden, cfg.heads, cfg.depth, cfg.max_len)
    policy.load_state_dict(reference.state_dict())
    # 冻结参考模型。
    for p in reference.parameters():
        p.requires_grad = False
    reference.eval()
    return reference, policy


def warmup_pretrain(
    model: TinyGPT,
    tok: InstructionTokenizer,
    triples: Sequence[Dict[str, str]],
    epochs: int = 8,
    lr: float = 3e-3,
    seed: int = 0,
) -> List[float]:
    """对提示与优选回答拼接后的完整序列，短暂训练下一词元预测。

    此步骤让参考模型在固定夹具上经历参数更新；并非仅对回答部分计算损失。
    """
    torch.manual_seed(seed)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    losses: List[float] = []
    model.train()
    sequences: List[List[int]] = []
    for tri in triples:
        prompt = tok.encode_prompt(tri["prompt"])
        chosen = tok.encode_completion(tri["chosen"])
        sequences.append(prompt + chosen)
    for _ in range(epochs):
        ep_loss = 0.0
        for seq in sequences:
            if len(seq) > model.max_len:
                seq = seq[: model.max_len]
            ids = torch.tensor([seq], dtype=torch.long)
            logits = model(ids)
            pred = logits[:, :-1, :].contiguous()
            target = ids[:, 1:].contiguous()
            loss = F.cross_entropy(pred.view(-1, pred.size(-1)), target.view(-1))
            opt.zero_grad()
            loss.backward()
            opt.step()
            ep_loss += float(loss.item())
        losses.append(ep_loss / max(len(sequences), 1))
    return losses


# ---------------------------------------------------------------------------
# 训练循环
# ---------------------------------------------------------------------------


@dataclass
class DPOReport:
    losses: List[float] = field(default_factory=list)
    margins: List[float] = field(default_factory=list)
    initial_margin: float = 0.0
    final_margin: float = 0.0


def evaluate_margins(
    policy: TinyGPT,
    reference: TinyGPT,
    tok: InstructionTokenizer,
    triples: Sequence[Dict[str, str]],
) -> float:
    """计算策略模型中 chosen-rejected 原始序列对数概率差的平均值。

    reference 参数在本函数中未使用；这不是减去参考模型后的 DPO 间隔，
    也不能预先保证训练一定使其转正。
    """
    margins: List[float] = []
    with torch.no_grad():
        for tri in triples:
            prompt = tok.encode_prompt(tri["prompt"])
            chosen = tok.encode_completion(tri["chosen"])
            rejected = tok.encode_completion(tri["rejected"])
            lp_w = sequence_log_prob(policy, prompt, chosen).item()
            lp_l = sequence_log_prob(policy, prompt, rejected).item()
            margins.append(lp_w - lp_l)
    return float(np.mean(margins)) if margins else 0.0


def train_dpo(
    policy: TinyGPT,
    reference: TinyGPT,
    tok: InstructionTokenizer,
    triples: Sequence[Dict[str, str]],
    cfg: DPOConfig,
    log: Callable[[str], None] = print,
) -> DPOReport:
    report = DPOReport()
    opt = torch.optim.Adam(policy.parameters(), lr=cfg.lr)
    # 预先计算参考模型的对数概率；本次训练循环固定使用这些值。
    ref_logps: List[Tuple[torch.Tensor, torch.Tensor]] = []
    with torch.no_grad():
        for tri in triples:
            prompt = tok.encode_prompt(tri["prompt"])
            chosen = tok.encode_completion(tri["chosen"])
            rejected = tok.encode_completion(tri["rejected"])
            lp_w_ref = sequence_log_prob(reference, prompt, chosen).detach()
            lp_l_ref = sequence_log_prob(reference, prompt, rejected).detach()
            ref_logps.append((lp_w_ref, lp_l_ref))
    report.initial_margin = evaluate_margins(policy, reference, tok, triples)
    for ep in range(1, cfg.epochs + 1):
        policy.train()
        total_loss = 0.0
        total_margin = 0.0
        for tri, (lp_w_ref, lp_l_ref) in zip(triples, ref_logps):
            prompt = tok.encode_prompt(tri["prompt"])
            chosen = tok.encode_completion(tri["chosen"])
            rejected = tok.encode_completion(tri["rejected"])
            lp_w_pol = sequence_log_prob(policy, prompt, chosen)
            lp_l_pol = sequence_log_prob(policy, prompt, rejected)
            loss, margin = dpo_loss(lp_w_pol, lp_l_pol, lp_w_ref, lp_l_ref, beta=cfg.beta)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += float(loss.item())
            total_margin += float(margin.item())
        report.losses.append(total_loss / max(len(triples), 1))
        report.margins.append(total_margin / max(len(triples), 1))
        log(f"  训练轮次 {ep:>3d}：损失={report.losses[-1]:.4f}  相对间隔={report.margins[-1]:+.4f}")
    report.final_margin = evaluate_margins(policy, reference, tok, triples)
    return report


# ---------------------------------------------------------------------------
# 演示
# ---------------------------------------------------------------------------


def run_demo(cfg: Optional[DPOConfig] = None) -> int:
    cfg = cfg or DPOConfig()
    torch.manual_seed(cfg.seed)
    np.random.seed(cfg.seed)
    random.seed(cfg.seed)

    tok = InstructionTokenizer()
    triples = make_preferences()

    print("从零实现 DPO 演示")
    print(f"三元组数量={len(triples)} beta={cfg.beta} 学习率={cfg.lr} 训练轮数={cfg.epochs}")
    print("")

    reference, policy = build_models(cfg)

    print(f"[预热] 对提示与优选回答拼接序列短暂预训练（{cfg.warmup_epochs} 轮）……")
    # build_models() 默认冻结参考模型，避免在 DPO 循环中意外更新。
    # 这里仅为预热临时解冻，正式偏好训练前再重新冻结。
    for p in reference.parameters():
        p.requires_grad = True
    reference.train()
    warm_losses = warmup_pretrain(
        reference,
        tok,
        triples,
        epochs=cfg.warmup_epochs,
        seed=cfg.seed,
    )
    # 将预热后的权重复制到策略模型，再次冻结参考模型。
    policy.load_state_dict(reference.state_dict())
    for p in reference.parameters():
        p.requires_grad = False
    reference.eval()
    print(f"         预热末轮损失 = {warm_losses[-1]:.4f}")

    initial = evaluate_margins(policy, reference, tok, triples)
    print(f"         初始优选—非优选原始间隔 = {initial:+.4f}")
    print("")

    print("[DPO 训练]")
    report = train_dpo(policy, reference, tok, triples, cfg)

    print("")
    print("[训练后逐条原始间隔]")
    print_margin_table(margin_table(policy, tok, triples))

    print("")
    print(f"最终原始间隔 = {report.final_margin:+.4f}（初始值为 {report.initial_margin:+.4f})")
    print(f"末轮平均损失 = {report.losses[-1]:.4f}（第 1 轮损失为 {report.losses[0]:.4f})")

    # 检查本次训练是否增大了初末原始对数概率间隔。
    if report.final_margin <= report.initial_margin:
        # 错误契约保留原文：训练没有增大优选与非优选回答之间的原始对数概率差。
        print("ERROR: training did not increase the chosen-rejected margin", file=sys.stderr)
        return 1
    # 同时检查首末轮损失是否下降。
    if report.losses[-1] >= report.losses[0]:
        # 错误契约保留原文：末轮损失未低于首轮损失。
        print("ERROR: training did not reduce loss across epochs", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
