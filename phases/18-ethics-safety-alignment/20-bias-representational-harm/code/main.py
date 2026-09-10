"""基于词嵌入的偏差探针（WEAT 形式），仅使用 Python 标准库。

手工构造四维向量，每个坐标轴代表一种示例语义维度。身份词组为：
A = {he, his, man}（男性指代词），B = {she, her, woman}（女性指代词）；
属性词组为 X = {engineer, programmer, scientist}（工程师、程序员、科学家），
Y = {nurse, teacher, caregiver}（护士、教师、照护者）。这些关联是人为注入的
测试偏差，不是对任何真实群体能力、职业或社会角色的判断。

对每个词计算 s(w,X,Y) = mean cosine(w,X) - mean cosine(w,Y)，再比较两组
身份词的平均分差。随后从职业词向量中移除指定的性别方向，观察数值变化。
运行方式：python3 code/main.py

译注：本例返回未经标准差归一化的均值差，并不是完整 WEAT 效应量，也没有
置换显著性检验。原文以 300 维预训练嵌入研究作对照，但本例没有加载此类
嵌入。残余关联来自手工向量中的其他方向，不能仅归因于向量只有四维。
"""

from __future__ import annotations

import math


# 四维人工嵌入：轴 0、1 为示例中的男性/女性方向，轴 2、3 为技术/照护方向。
EMB = {
    # 身份词组 A：男性指代词。
    "he":        [ 1.0, 0.0, 0.2,  0.0],
    "his":       [ 0.9, 0.0, 0.1,  0.0],
    "man":       [ 1.0, 0.0, 0.1,  0.1],
    # 身份词组 B：女性指代词。
    "she":       [ 0.0, 1.0, 0.0,  0.2],
    "her":       [ 0.0, 0.9, 0.0,  0.1],
    "woman":     [ 0.0, 1.0, 0.1,  0.2],
    # 属性词组 X：原文的技术/职业词组。
    "engineer":  [ 0.4, 0.0, 1.0,  0.0],
    "programmer":[ 0.4, 0.0, 1.0,  0.0],
    "scientist": [ 0.3, 0.0, 1.0,  0.1],
    # 属性词组 Y：原文的照护/家庭相关词组；这是测试分组，不是职业判断。
    "nurse":     [ 0.0, 0.4, 0.0,  1.0],
    "teacher":   [ 0.0, 0.3, 0.1,  1.0],
    "caregiver": [ 0.0, 0.4, 0.0,  1.0],
}


def cos(u: list[float], v: list[float]) -> float:
    nu = math.sqrt(sum(x * x for x in u)) + 1e-9
    nv = math.sqrt(sum(x * x for x in v)) + 1e-9
    return sum(a * b for a, b in zip(u, v)) / (nu * nv)


def weat_score(identity_a: list[str], identity_b: list[str],
               attr_x: list[str], attr_y: list[str]) -> float:
    def s(w):
        mx = sum(cos(EMB[w], EMB[a]) for a in attr_x) / len(attr_x)
        my = sum(cos(EMB[w], EMB[a]) for a in attr_y) / len(attr_y)
        return mx - my
    mean_a = sum(s(w) for w in identity_a) / len(identity_a)
    mean_b = sum(s(w) for w in identity_b) / len(identity_b)
    return mean_a - mean_b


def debias(emb: dict) -> dict:
    """简化去偏：从职业词向量中减去沿 [1,-1,0,0] 性别方向的投影。"""
    new = {k: list(v) for k, v in emb.items()}
    gender_dir = [1.0, -1.0, 0.0, 0.0]
    norm_sq = sum(x * x for x in gender_dir)
    for w in ["engineer", "programmer", "scientist",
              "nurse", "teacher", "caregiver"]:
        proj = sum(a * b for a, b in zip(new[w], gender_dir)) / norm_sq
        new[w] = [a - proj * b for a, b in zip(new[w], gender_dir)]
    return new


def main() -> None:
    global EMB
    print("=" * 70)
    print("WEAT 形式的偏差探针（阶段 18，第 20 课）")
    print("=" * 70)

    A = ["he", "his", "man"]
    B = ["she", "her", "woman"]
    X = ["engineer", "programmer", "scientist"]
    Y = ["nurse", "teacher", "caregiver"]

    pre = weat_score(A, B, X, Y)
    print(f"\n去偏前的关联均值差（非标准化 WEAT 效应量）：{pre:+.4f}")
    print("（正值表示：相对于 Y，身份词组 A 与 X 的关联比 B 更强。）")

    EMB = debias(EMB)
    post = weat_score(A, B, X, Y)
    print(f"去偏后的关联均值差（非标准化 WEAT 效应量）：{post:+.4f}")

    print("\n" + "=" * 70)
    print("要点：可以度量人工词嵌入中的关联偏差，并通过移除相关方向降低部分偏差。")
    print("本例指标没有降至零，因为其他向量方向仍保留了组间关联；")
    print("不能仅把原因归结为四维。原文引用 Bolukbasi（2016）的去偏研究，")
    print("以 300 维嵌入说明降低关联不等于消除所有偏差。")
    print("还需结合概率层面与生成文本层面的指标，")
    print("检查是否仍存在行为偏差；本例没有进行这些评测。")
    print("=" * 70)


if __name__ == "__main__":
    main()
