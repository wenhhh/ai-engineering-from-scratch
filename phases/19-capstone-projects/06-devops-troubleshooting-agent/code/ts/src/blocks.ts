/**
 * 构建 Slack Block Kit 卡片、审批按钮与交互回复。
 * 按钮标签与消息说明中文化；action_id、response_type、事件 ID 等协议字段不变。
 * 批准回复的英文前缀被现有测试匹配，因此保留并补中文说明；所有动作只生成文本，不调用 MCP。
 */

import type { AgentReport, Block, SlackResponse } from "./types.js";

export function buildSlackResponse(report: AgentReport): SlackResponse {
  const blocks: Block[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `事件 ${report.incidentId}` },
    },
  ];
  for (const h of report.topHypotheses) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*#${h.rank}.* ${h.summary}\n` +
          `证据：\n- ${h.evidence.join("\n- ")}\n` +
          `_建议处置：_ ${h.remediation}`,
      },
    });
  }
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "批准首选处置方案" },
        style: "primary",
        action_id: "approve",
        value: report.incidentId,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "升级处理" },
        action_id: "escalate",
        value: report.incidentId,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "忽略" },
        style: "danger",
        action_id: "ignore",
        value: report.incidentId,
      },
    ],
  });
  return { response_type: "in_channel", blocks };
}

export function actionReply(actionId: string, incidentId: string): SlackResponse {
  let text: string;
  if (actionId === "approve") {
    text = `Approved remediation for ${incidentId}。已批准处置方案（仅模拟受控 MCP 调用，未执行修复）。`;
  } else if (actionId === "escalate") {
    text = `已将 ${incidentId} 升级至值班人员（模拟记录）。`;
  // 任何其他 actionId 都进入“忽略”分支，包括未知动作；不是完整授权检查。
  } else {
    text = `已忽略 ${incidentId}（模拟记录）。`;
  }
  return { response_type: "in_channel", replace_original: false, text };
}
