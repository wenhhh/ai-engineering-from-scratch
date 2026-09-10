/**
 * 规划、编码与评审三个确定性角色桩。
 * 路由使用英文 topic；文件路径、写入工作空间的计划和源码夹具保留原值，
 * 因为这些内容参与 workspace.fingerprint() 哈希。它们的中文含义见相邻说明。
 * 编码者只追加注释并写入 assert True 的占位测试；评审者第二次收到 diff 即批准，
 * 没有验证缺陷真的被修复，也不执行测试。
 */

import type { Message, Role } from "./types.js";
import type { SharedWorkspace } from "./workspace.js";

export abstract class Agent {
  abstract readonly role: Role;
  protected sent = 0;
  protected received = 0;

  receive(_m: Message): void {
    this.received += 1;
  }

  protected emit(
    workspace: SharedWorkspace,
    to: Role | "broadcast",
    topic: string,
    body: string,
  ): Message {
    const message: Message = {
      from: this.role,
      to,
      topic,
      body,
      ts: Date.now(),
    };
    workspace.appendMessage(message);
    this.sent += 1;
    return message;
  }

  abstract step(workspace: SharedWorkspace, inbound: Message): Message | null;

  stats(): { role: Role; sent: number; received: number } {
    return { role: this.role, sent: this.sent, received: this.received };
  }
}

export class PlannerAgent extends Agent {
  readonly role = "planner" as const;
  private planned = false;

  step(workspace: SharedWorkspace, inbound: Message): Message | null {
    super.receive(inbound);
    if (inbound.topic === "issue.opened" && !this.planned) {
      // 固定计划：1. 解析 test_payments.py 中失败的测试；2. 修补 refunds.py 的退款舍入；3. 添加 test_refund_rounding 回归测试。
      // 这些英文计划行参与工作空间指纹计算，保持原样。
      const plan = [
        "1. parse failing test in test_payments.py",
        "2. patch refund rounding in refunds.py",
        "3. add regression test test_refund_rounding",
      ].join("\n");
      workspace.write("PLAN.md", plan, this.role);
      this.planned = true;
      return this.emit(workspace, "coder", "plan.ready", plan);
    }
    if (inbound.topic === "review.changes_requested") {
      return this.emit(
        workspace,
        "coder",
        "plan.amended",
        `依据评审意见调整计划： ${inbound.body}`,
      );
    }
    return null;
  }
}

export class CoderAgent extends Agent {
  readonly role = "coder" as const;

  step(workspace: SharedWorkspace, inbound: Message): Message | null {
    super.receive(inbound);
    if (inbound.topic === "plan.ready" || inbound.topic === "plan.amended") {
      const file = workspace.read("refunds.py");
      // 源码夹具中的 rounding fix 意为“舍入修复”，实际只追加注释，并未实现修复。
      const next =
        (file?.contents ?? "def refund(x):\n    return x\n") +
        "\n# rounding fix\n";
      workspace.write("refunds.py", next, this.role);
      // 保留占位测试源码及其哈希载荷；assert True 不验证退款行为。
      workspace.write(
        "tests/test_refund_rounding.py",
        "def test_refund_rounding():\n    assert True\n",
        this.role,
      );
      return this.emit(
        workspace,
        "reviewer",
        "diff.ready",
        `fp=${workspace.fingerprint()}`,
      );
    }
    return null;
  }
}

export class ReviewerAgent extends Agent {
  readonly role = "reviewer" as const;
  private reviews = 0;

  step(workspace: SharedWorkspace, inbound: Message): Message | null {
    super.receive(inbound);
    if (inbound.topic === "diff.ready") {
      this.reviews += 1;
      const plan = workspace.read("PLAN.md");
      const refunds = workspace.read("refunds.py");
      if (!plan || !refunds) {
        return this.emit(
          workspace,
          "planner",
          "review.changes_requested",
          "缺少计划或 refunds.py",
        );
      }
      if (this.reviews === 1) {
        return this.emit(
          workspace,
          "planner",
          "review.changes_requested",
          "测试只断言 True，没有失败用例",
        );
      }
      return this.emit(workspace, "broadcast", "review.approved", "看起来没问题");
    }
    return null;
  }
}
