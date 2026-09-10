"""将目标转化为问题，再定义效果指标与安全约束指标。

outcome 为效果指标，guardrail 为安全约束指标；at-most/at-least 分别是“不高于/不低于”，
比较包含阈值本身。指标名称作为 values 字典的键，保留英文以维持查找与测试契约。
median_identification_seconds、correct_service_rate、production_writes 分别是
识别耗时中位数（秒）、正确服务识别率、生产环境写入次数。

译注：输入数值由 main 直接预设，示例不读取真实日志或计算样本统计量。
报告顶层 status=valid 只表示计划定义检查通过；指标缺失或未达标不一定使顶层变为 invalid，
需逐项检查 results，不能只看顶层状态来认定效果达标。
"""

# 课程示例：从效果目标推导可复现的指标定义。
# 课程正文：phases/14-agent-engineering/52-design-success-metrics/docs/en.md
# 参考原文：Basili, Software Modeling and Measurement: The GQM Paradigm, 1992.
# 参考原文：Basili, Caldiera, and Rombach, The Goal Question Metric Approach.
# 运行本文件可生成 outputs/measurement-report.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Metric:
    name: str
    direction: str
    threshold: float
    window: str
    source: str
    kind: str


@dataclass
class MeasurementPlan:
    goal: str
    questions: list[str]
    metrics: list[Metric]


def validate(plan: MeasurementPlan) -> list[str]:
    issues: list[str] = []
    if not plan.goal.strip():
        # 目标为空。
        issues.append("goal is empty")
    if not plan.questions:
        # 未定义度量问题。
        issues.append("questions are empty")
    if not plan.metrics:
        # 未定义指标。
        issues.append("metrics are empty")
    kinds = {metric.kind for metric in plan.metrics}
    if "outcome" not in kinds:
        # 缺少效果指标。
        issues.append("outcome metric is missing")
    if "guardrail" not in kinds:
        # 缺少安全约束指标。
        issues.append("guardrail metric is missing")
    for metric in plan.metrics:
        if metric.direction not in {"at-most", "at-least"}:
            # 指标的比较方向无效。
            issues.append(f"{metric.name} has invalid direction")
        if not metric.source.strip() or not metric.window.strip():
            # 指标缺少数据来源或测量窗口。
            issues.append(f"{metric.name} lacks source or window")
    return issues


def evaluate(metric: Metric, value: float) -> bool:
    if metric.direction == "at-most":
        return value <= metric.threshold
    if metric.direction == "at-least":
        return value >= metric.threshold
    # 比较方向无效。
    raise ValueError("invalid direction")


def report(plan: MeasurementPlan, values: dict[str, float]) -> dict:
    issues = validate(plan)
    results = []
    for metric in plan.metrics:
        if metric.direction not in {"at-most", "at-least"}:
            result = {"name": metric.name, "status": "invalid"}
            if metric.name in values:
                result["value"] = values[metric.name]
            results.append(result)
        elif metric.name not in values:
            results.append({"name": metric.name, "status": "missing"})
        else:
            results.append({"name": metric.name, "value": values[metric.name], "passed": evaluate(metric, values[metric.name])})
    return {"status": "valid" if not issues else "invalid", "issues": issues, "plan": asdict(plan), "results": results}


def example() -> MeasurementPlan:
    return MeasurementPlan(
        goal="缩短识别受影响服务的时间，同时不增加不安全操作",
        questions=["识别正确服务需要多长时间？", "诊断是否始终保持只读？"],
        metrics=[
            Metric("median_identification_seconds", "at-most", 120, "十次事故回放", "回放日志", "outcome"),
            Metric("correct_service_rate", "at-least", 0.9, "十次事故回放", "事故记录", "outcome"),
            Metric("production_writes", "at-most", 0, "整个试点期间", "审计日志", "guardrail"),
        ],
    )


def main() -> None:
    values = {"median_identification_seconds": 94, "correct_service_rate": 0.9, "production_writes": 0}
    output = Path(__file__).resolve().parents[1] / "outputs" / "measurement-report.json"
    output.write_text(json.dumps(report(example(), values), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
