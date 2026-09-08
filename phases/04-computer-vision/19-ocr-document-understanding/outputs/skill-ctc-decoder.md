---
name: skill-ctc-decoder
description: 从零编写贪心与束搜索 CTC 解码器，包括长度归一化
version: 1.0.0
phase: 4
lesson: 19
tags: [ocr, ctc, decoding, sequence-models]
---

# CTC 解码器（CTC Decoder）

为连接时序分类（Connectionist Temporal Classification，CTC）输出生成两种解码程序：贪心解码（Greedy Decoding），速度快；束搜索（Beam Search），对噪声输入效果更好。

## 使用时机（When to use）

- 对自定义卷积循环神经网络（Convolutional Recurrent Neural Network，CRNN）输出进行 OCR 推理。
- 为预训练 OCR 模型比较不同解码器的基准表现。
- 不引入 ctcdecode，实现简单束搜索。

## 输入（Inputs）

- `log_probs`：词表上的 (T, N, C) log-softmax，约定索引 0 为空白符。
- `vocab`：包含 C 个字符的列表。
- `beam_width`（仅束搜索）：通常为 5-10。

## 贪心解码器（Greedy decoder）

```python
def greedy_ctc_decode(log_probs, vocab, blank=0):
    preds = log_probs.argmax(dim=-1).transpose(0, 1).cpu().tolist()
    out = []
    for seq in preds:
        decoded = []
        prev = None
        for idx in seq:
            if idx != prev and idx != blank:
                decoded.append(vocab[idx])
            prev = idx
        out.append("".join(decoded))
    return out
```

## 束搜索解码器（Beam search decoder）

```python
import heapq
import math

def beam_ctc_decode(log_probs, vocab, beam_width=5, blank=0):
    T, N, C = log_probs.shape
    lp = log_probs.cpu()
    results = []
    for n in range(N):
        beams = {("",): (0.0, -math.inf)}  # (prefix_tuple) -> (p_blank, p_nonblank)
        for t in range(T):
            logits_t = lp[t, n]
            new_beams = {}
            for prefix, (p_b, p_nb) in beams.items():
                for c in range(C):
                    p = logits_t[c].item()
                    if c == blank:
                        nb = p_b + p
                        nnb = p_nb + p
                        upd = new_beams.get(prefix, (-math.inf, -math.inf))
                        new_beams[prefix] = (
                            _logsumexp(upd[0], _logsumexp(nb, nnb)),
                            upd[1],
                        )
                    else:
                        last = prefix[-1] if prefix else ""
                        char = vocab[c]
                        if char == last:
                            # Case 1: stay on same prefix (collapse from p_nb)
                            upd = new_beams.get(prefix, (-math.inf, -math.inf))
                            new_beams[prefix] = (upd[0], _logsumexp(upd[1], p_nb + p))
                            # Case 2: extend prefix via blank-separated repeat ("a_a" -> "aa")
                            new_prefix = prefix + (char,)
                            upd = new_beams.get(new_prefix, (-math.inf, -math.inf))
                            new_beams[new_prefix] = (upd[0], _logsumexp(upd[1], p_b + p))
                        else:
                            new_prefix = prefix + (char,)
                            upd = new_beams.get(new_prefix, (-math.inf, -math.inf))
                            nb = _logsumexp(p_b, p_nb) + p
                            new_beams[new_prefix] = (upd[0], _logsumexp(upd[1], nb))
            beams = dict(heapq.nlargest(
                beam_width,
                new_beams.items(),
                key=lambda kv: _logsumexp(kv[1][0], kv[1][1]),
            ))
        best = max(beams.items(), key=lambda kv: _logsumexp(kv[1][0], kv[1][1]))[0]
        results.append("".join(best))
    return results


def _logsumexp(a, b):
    if a == -math.inf: return b
    if b == -math.inf: return a
    m = max(a, b)
    return m + math.log(math.exp(a - m) + math.exp(b - m))
```

## 规则（Rules）

- PyTorch `nn.CTCLoss` 中，CTC 空白符索引约定为 0。
- 束搜索能提高低置信度输入的准确率；干净输入上的字符错误率（Character Error Rate，CER）改善 <1%。
- 不要把束宽剪到 5 以下，低于该值时准确率与延迟的权衡趋于平坦。
- 延迟预算紧张时，将束搜索降级为贪心解码；多数生产 OCR 数据的质量损失较小。
- 大词表，例如包含 3000 个以上字符的中日韩文字，改用 C++ 的 `ctcdecode`，而非上述纯 Python 版本；Python 束搜索很快就会成为瓶颈。
