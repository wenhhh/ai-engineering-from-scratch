/**
 * 共享类型：角色、消息、内存文件、运行结果与命令启动参数。
 * planner/coder/reviewer 分别是规划者／编码者／评审者；broadcast 表示广播标识。
 * approved 只表示示例收到批准消息；refused 是拒绝原因，不等于子进程退出状态。
 */

export type Role = "planner" | "coder" | "reviewer";

export type Message = {
  from: Role | "user";
  to: Role | "broadcast";
  topic: string;
  body: string;
  ts: number;
};

export type WorkspaceFile = {
  path: string;
  contents: string;
  lastWriter?: Role;
  revisions: number;
};

export type RunResult = { approved: boolean; turns: number };

export type LaunchArgs = {
  branch: string;
  command: string;
  argv: string[];
};

export type LaunchResult = {
  stdout: string;
  stderr: string;
  refused?: string;
};
