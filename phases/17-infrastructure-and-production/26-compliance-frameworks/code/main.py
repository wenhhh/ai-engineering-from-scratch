"""跨框架合规映射（Compliance Mapping），仅使用 Python 标准库。

给定控制措施（Control），输出其满足的框架；给定客户画像（Customer Profile），
即地区与行业，输出所需框架。
"""

from __future__ import annotations


# 映射键与法规引用是示例查询数据，保留原值；中文释义见各项注释。
CONTROL_MAP = {
    "access logging": ["ISO 27001 A.5.15-5.18", "GDPR Art. 32", "HIPAA §164.312(a)", "SOC 2 CC6"],  # 访问日志（Access Logging）
    "change management": ["ISO 27001 A.8.32", "PCI DSS Req. 6", "HIPAA breach-notification", "SOC 2 CC8"],  # 变更管理（Change Management）；breach-notification 为泄露通知
    "encryption in transit": ["ISO 27001 A.8.24", "GDPR Art. 32", "HIPAA §164.312(e)", "PCI DSS Req. 4"],  # 传输加密（Encryption in Transit）
    "secrets management": ["ISO 27001 A.8.19", "PCI DSS Req. 8", "SOC 2 CC6.1"],  # 机密管理（Secrets Management）
    "PII redaction (inference-time)": ["GDPR Art. 25", "EU AI Act Art. 10", "HIPAA §164.514"],  # 推理时个人身份信息脱敏（PII Redaction）
    "audit log retention": ["SOC 2 CC7", "HIPAA §164.312(b)", "ISO 27001 A.8.15"],  # 审计日志保留（Audit Log Retention）
    "conformity assessment": ["EU AI Act Art. 43 (high-risk)"],  # 符合性评估（Conformity Assessment）；high-risk 为高风险
    "impact assessment": ["Colorado AI Act SB24-205", "EU AI Act Art. 27"],  # 影响评估（Impact Assessment）
    "data subject rights": ["GDPR Ch. III", "CCPA"],  # 数据主体权利（Data Subject Rights）
    "BAA signed": ["HIPAA §164.504(e)"],  # 已签署业务伙伴协议（BAA）
}


# 地区：US 美国、EU 欧盟、Global 全球、US-CO 美国科罗拉多州。
# 行业：B2B SaaS 企业软件即服务、healthcare 医疗、fintech 金融科技、enterprise 企业。
PROFILE_MAP = {
    ("US", "B2B SaaS"):             ["SOC 2 Type II", "ISO 27001", "ISO 42001"],
    ("US", "healthcare"):           ["SOC 2 Type II", "HIPAA", "ISO 27001"],
    ("US", "fintech"):              ["SOC 2 Type II", "PCI-DSS", "ISO 27001"],
    ("EU", "B2B SaaS"):             ["GDPR", "SOC 2 Type II", "ISO 27001", "EU AI Act"],
    ("EU", "healthcare"):           ["GDPR", "SOC 2 Type II", "HIPAA (global)", "EU AI Act"],
    ("Global", "enterprise"):       ["SOC 2 Type II", "ISO 27001", "ISO 42001", "GDPR", "HIPAA", "EU AI Act"],
    ("US-CO", "B2B SaaS"):          ["SOC 2 Type II", "Colorado AI Act", "ISO 27001"],
}


def main() -> None:
    print("=" * 80)
    print("合规控制映射：一项控制措施，对应多个框架")
    print("=" * 80)
    for control, frameworks in CONTROL_MAP.items():
        print(f"\n{control}")
        for f in frameworks:
            print(f"  → {f}")

    print("\n" + "=" * 80)
    print("客户画像映射：不同地区与行业所需的框架")
    print("=" * 80)
    for (geo, segment), frameworks in PROFILE_MAP.items():
        print(f"\n{geo} · {segment}")
        for f in frameworks:
            print(f"  · {f}")

    print("\n说明：欧盟人工智能法案（EU AI Act）的高风险规定于 2026 年 8 月 2 日开始执行。")
    print("罚款最高为 3500 万欧元，或全球年营业额的 7%。")


if __name__ == "__main__":
    main()
