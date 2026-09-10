/**
 * 告警分析桩：仅按英文关键词选择固定假设，不查询真实集群或遥测系统。
 * OOMKilled、CrashLoopBackOff 与 telemetry 仍供现有消费者匹配；证据字符串保留原文。
 */

import type { AgentReport } from "./types.js";

let incidentCounter = 0;

export function mockAgent(alertText: string): AgentReport {
  const tokens = alertText.toLowerCase();
  incidentCounter += 1;
  const incidentId = `inc-${Date.now()}-${incidentCounter}`;
  // 内存告警分支：原样保留 oom / memory 匹配词。
  if (tokens.includes("oom") || tokens.includes("memory")) {
    return {
      incidentId,
      topHypotheses: [
        {
          rank: 1,
          summary:
            "Pod payments-api-7c4 在 10 分钟内两次 OOMKilled；假设其 256Mi 内存请求过低。",
          evidence: [
            "kube-state-metrics: kube_pod_container_status_terminated_reason{reason=OOMKilled}",
            // 模拟证据：内存工作集的第 99 百分位达到上限。
            "Prom: container_memory_working_set_bytes p99 hit limit",
          ],
          remediation: "建议将 payments-api 的内存请求调为 512Mi、上限调为 1Gi（仅为模拟建议）",
        },
        {
          rank: 2,
          summary: "v2.41 发布可能引入了内存泄漏（Argo，模拟假设）。",
          // 模拟证据：ArgoCD 显示 payments-api 的 v2.41 在 14 分钟前部署。
          evidence: ["ArgoCD: payments-api revision v2.41 deployed 14m ago"],
          remediation: "建议将 payments-api 回滚至 v2.40（未执行）",
        },
      ],
    };
  }
  if (tokens.includes("crashloop") || tokens.includes("restart")) {
    return {
      incidentId,
      topHypotheses: [
        {
          rank: 1,
          summary: "auth-svc 出现 CrashLoopBackOff，就绪探针路径返回 404（模拟假设）。",
          evidence: [
            "kube_pod_container_status_waiting_reason{reason=CrashLoopBackOff}",
            // 模拟证据：auth-svc 的探针路径由 /healthz 改为 /ready。
            "auth-svc deployment changed probe path from /healthz to /ready",
          ],
          remediation: "建议将 auth-svc 部署的 spec.probe.path 恢复为 /healthz（未执行）",
        },
      ],
    };
  }
  return {
    incidentId,
    topHypotheses: [
      {
        rank: 1,
        summary: "没有匹配的先前信号；建议先收集遥测（telemetry）。",
        // 模拟证据：过去 30 分钟没有匹配的 Prom 告警。
        evidence: ["no matching prom alerts in last 30m"],
        remediation: "尚未提出处置方案",
      },
    ],
  };
}
