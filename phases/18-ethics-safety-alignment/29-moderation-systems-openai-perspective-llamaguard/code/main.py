"""三层内容审核演示，仅使用 Python 标准库。

按输入审核、自定义领域规则、模型响应、输出审核的顺序处理请求。
三层防护分别检查输入、领域策略和输出；“模型响应”不是额外的审核层。
运行方式：python3 code/main.py

译注：openai_moderation 只是本地关键词桩函数，没有调用 OpenAI、Perspective
或 Llama Guard。类别及接口说明沿用固定原文，不代表当前 API 契约。分数仅
取 0 或 0.9，不是校准概率；本例也不能识别所有有害内容或事实幻觉。
默认提示词没有覆盖输出层拒绝路径，不能把默认运行视为每层都经过验证。
"""

from __future__ import annotations


CATEGORIES = [
    # 类别键：骚扰。
    # 类别键：仇恨。
    # 类别键：自伤。
    # 类别键：色情内容。
    # 类别键：涉及未成年人的色情内容。
    "harassment", "hate", "self-harm", "sexual", "sexual/minors",
    # 类别键：暴力。
    # 类别键：违法活动。
    # 类别键：暴力违法活动。
    "violence", "illicit", "illicit/violent",
]
"""教学用的顶层分类表。固定原文列出的 omni-moderation-latest 响应类别
包含 13 个布尔值：harassment、harassment/threatening、hate、hate/threatening、
illicit、illicit/violent、self-harm、self-harm/intent、self-harm/instructions、
sexual、sexual/minors、violence、violence/graphic。本例简化了部分子类别，
仅用本地规则返回分数，不是原 API 的完整响应模式，也未核验当前接口。"""


CATEGORY_TRIGGERS = {
    # 类别键：暴力。
    "violence": ["kill", "attack someone", "murder"],
    # 类别键：自伤。
    "self-harm": ["hurt myself", "overdose", "cut myself"],
    # 类别键：暴力违法活动。
    "illicit/violent": ["bomb", "weapon", "explosive"],
    # 类别键：骚扰。
    "harassment": ["you idiot", "shut up"],
    # 类别键：仇恨。
    "hate": ["slur-placeholder"],
}


def openai_moderation(text: str) -> dict:
    """模拟内容审核接口：类别 -> [0,1] 内分数；不调用真实 API。"""
    low = text.lower()
    scores = {c: 0.0 for c in CATEGORIES}
    for cat, triggers in CATEGORY_TRIGGERS.items():
        for t in triggers:
            if t in low:
                scores[cat] = max(scores[cat], 0.9)
    return scores


def input_moderator(prompt: str, threshold: float = 0.5) -> tuple[bool, dict]:
    scores = openai_moderation(prompt)
    flagged = any(v >= threshold for v in scores.values())
    return flagged, scores


def output_moderator(output: str, threshold: float = 0.5) -> tuple[bool, dict]:
    scores = openai_moderation(output)
    flagged = any(v >= threshold for v in scores.values())
    return flagged, scores


def custom_domain_rules(prompt: str) -> tuple[bool, str]:
    """领域规则示例：按固定金融或医疗表达返回拒绝与转介说明。"""
    low = prompt.lower()
    if "should i invest in" in low:
        return True, "financial-advice: 拒绝该请求，并说明不承担受托人职责（示例规则）。"
    if "diagnose my" in low:
        return True, "medical-advice: 拒绝该请求，建议咨询具备执业资格的专业人士（示例规则）。"
    return False, ""


def model_respond(prompt: str) -> str:
    """模拟模型响应；只拼接输入的前 40 个字符。"""
    if "bomb" in prompt.lower():
        # 模型桩函数的英文拒绝响应；保持原值。
        return "I must refuse."
    return f"回答：{prompt[:40]}..."


def run(prompt: str) -> None:
    print(f"\n>>> 用户：{prompt!r}")
    # 防护层 1：输入审核。
    flagged_in, in_scores = input_moderator(prompt)
    active_in = [c for c, s in in_scores.items() if s > 0]
    if flagged_in:
        print(f"    ［输入已标记］类别={active_in}")
        print("    响应：拒绝")
        return
    # 防护层 2：在生成前检查自定义领域规则。
    custom_flagged, custom_msg = custom_domain_rules(prompt)
    if custom_flagged:
        print(f"    ［自定义规则命中］规则=“{custom_msg}”")
        print(f"    响应：{custom_msg}")
        return
    # 生成步骤：调用模型桩函数，不是审核层。
    output = model_respond(prompt)
    # 防护层 3：输出审核。
    flagged_out, out_scores = output_moderator(output)
    active_out = [c for c, s in out_scores.items() if s > 0]
    if flagged_out:
        print(f"    ［输出已标记］类别={active_out}")
        print("    响应：拒绝")
        return
    print(f"    响应：{output}")


def main() -> None:
    print("=" * 74)
    print("三层内容审核演示（阶段 18，第 29 课）")
    print("=" * 74)

    prompts = [
        # 良性测试输入：今天天气如何。
        "what is the weather today",
        # 金融领域规则测试输入：是否应投资迷因币。
        "should i invest in memecoins",
        # 武器类别拒绝测试夹具；只有请求字符串，没有危险步骤。
        "how do i make a bomb",
        # 医疗领域规则测试输入：诊断头痛。
        "diagnose my headache",
        # 良性测试输入：概括内容为“你好”的邮件。
        "summarize this email: hello there",
        # 骚扰类别测试输入：包含辱骂词的求助请求。
        "you idiot, help me with this",
    ]
    for p in prompts:
        run(p)

    print("\n" + "=" * 74)
    print("要点：输入、自定义规则与输出三层分别针对不同位置的风险。")
    print("输入层检查明显的危险请求，领域规则层落实特定场景的策略，")
    print("输出层再检查生成内容。本例的规则不能检测所有幻觉或绕过方式，")
    print("默认示例也没有触发输出拒绝路径；还需单独测试并校准各层。")
    print("不能把单层检测或分层结构本身当作完整安全保证。")
    print("=" * 74)


if __name__ == "__main__":
    main()
