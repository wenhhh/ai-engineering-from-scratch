"""AI 控制协议模拟，仅使用 Python 标准库。

在一个玩具后门任务上比较四种协议：
  baseline   ：直接交付不可信模型 U 的输出。
  upfront    ：优先让人类审核者 H 审核输出，直至预算用尽。
  untrusted  ：由另一个 U 实例检查输出，存在串通风险。
  trusted_ed ：由可信模型 T 编辑所有输出；低置信度时在预算内交给 H。

指标为含后门输出的交付比例（越低越安全）和有用输出的比例。
运行方式：python3 code/main.py

译注：这里的模型、人类审核和后门全是随机变量及字符串标签；H 被假定能识别
后门。untrusted 分支中，被标记且进入 H 审核的良性输出也未计入 useful，
与其他分支的计数方式不同。结尾的帕累托优势表述来自原文，不能仅凭本例
认定为普遍结论或真实安全保证。
"""

from __future__ import annotations

import random


random.seed(23)


def u_produce(backdoor_rate: float) -> tuple[str, bool]:
    """U 产生输出，返回（输出，是否含后门）。"""
    is_backdoor = random.random() < backdoor_rate
    # 结果标签：有用输出；程序据此累计 useful。
    # 结果标签：含后门输出；这里只是标签，不生成真实后门。
    return ("useful" if not is_backdoor else "backdoor"), is_backdoor


def t_edit(output: str, is_backdoor: bool, t_skill: float,
           overreject: float = 0.05) -> tuple[str, bool, bool]:
    """T 编辑输出，返回（编辑后输出，是否仍含后门，T 是否低置信度）。

    T 以 t_skill 的概率成功移除后门，也会以 overreject 的概率误拒良性输出。
    """
    if is_backdoor:
        if random.random() < t_skill:
            # 结果标签：有用输出；程序据此累计 useful。
            return ("useful", False, False)
        # 结果标签：含后门输出；这里只是标签，不生成真实后门。
        return ("backdoor", True, True)
    # 良性输入：T 仍可能以一定概率误拒。
    if random.random() < overreject:
        # 结果标签：拒绝输出。
        return ("rejected", False, True)
    # 结果标签：有用输出；程序据此累计 useful。
    return ("useful", False, False)


def untrusted_monitor(is_backdoor: bool, collusion: float) -> bool:
    """由第二个 U 实例检查输出；若发生串通，就会放过后门。

    collusion 表示监控者与生成者串通的概率。
    返回 True 表示监控者标记该输出；良性输入也可能被误标。
    """
    if not is_backdoor:
        # 监控者通常放行良性输出，但仍有 5% 的误标概率。
        return random.random() < 0.05
    # 监控者原本可能标记后门；串通会抑制这一信号。
    if random.random() < collusion:
        return False
    return random.random() < 0.80


def run_protocol(name: str, backdoor_rate: float, h_budget: float,
                 n: int, t_skill: float = 0.7, collusion: float = 0.30) -> None:
    useful, shipped_backdoor, used_h = 0, 0, 0
    for _ in range(n):
        _, is_bd = u_produce(backdoor_rate)
        if name == "baseline":
            if not is_bd:
                useful += 1
            else:
                shipped_backdoor += 1
        elif name == "upfront":
            if used_h / n < h_budget:
                used_h += 1
                if not is_bd:
                    useful += 1
            else:
                if not is_bd:
                    useful += 1
                else:
                    shipped_backdoor += 1
        elif name == "untrusted":
            flagged = untrusted_monitor(is_bd, collusion)
            if flagged:
                if used_h / n < h_budget:
                    used_h += 1
                else:
                    if not is_bd:
                        useful += 1
                    else:
                        shipped_backdoor += 1
            else:
                if not is_bd:
                    useful += 1
                else:
                    shipped_backdoor += 1
        elif name == "trusted_ed":
            edited, still_bd, low_conf = t_edit("x", is_bd, t_skill)
            if low_conf and used_h / n < h_budget:
                used_h += 1
                if not is_bd:
                    useful += 1
            else:
                # 结果标签：有用输出；程序据此累计 useful。
                if edited == "useful":
                    useful += 1
                elif still_bd:
                    shipped_backdoor += 1
    print(f"\n{name:>12s}  有用输出比例={useful/n:.3f}  后门交付比例={shipped_backdoor/n:.3f}"
          f"  H 审核比例={used_h/n:.3f}")


def main() -> None:
    print("=" * 70)
    print("AI 控制协议模拟（阶段 18，第 10 课）")
    print("=" * 70)

    for br in (0.05, 0.10, 0.20):
        print(f"\n-- 后门生成概率 = {br}，H 预算比例 = 0.10，样本数 = 1000 --")
        for proto in ("baseline", "upfront", "untrusted", "trusted_ed"):
            run_protocol(proto, backdoor_rate=br, h_budget=0.10, n=1000)

    print("\n-- 不可信监控的串通概率扫描（后门生成概率 = 0.10）--")
    for col in (0.0, 0.20, 0.50, 0.80):
        print(f"\n串通概率={col}")
        run_protocol("untrusted", backdoor_rate=0.10, h_budget=0.10, n=1000,
                     collusion=col)

    print("\n" + "=" * 70)
    print("原文要点：在这个玩具任务中，可信编辑相对不可信监控呈现帕累托优势；")
    print("两个 U 实例之间的串通会削弱不可信监控的安全信号。")
    print("本例假设 T 不具有对抗性，因此可信编辑不承担这种串通风险。")
    print("代价是：T 的编辑效果受其自身能力限制；")
    print("当 U 与 T 的能力差距进一步扩大时，控制可能失效。")
    print("参考原文所引 Greenblatt（2023）；本例计数边界见文件开头的译注。")
    print("=" * 70)


if __name__ == "__main__":
    main()
