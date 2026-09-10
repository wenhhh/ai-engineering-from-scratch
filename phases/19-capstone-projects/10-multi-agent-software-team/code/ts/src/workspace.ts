/**
 * 共享内存工作空间与消息日志，不写入真实仓库。
 * 指纹按排序后的路径和完整文件内容计算 SHA-256，再取前 12 个十六进制字符。
 * 英文计划与源码夹具保持原值以保留哈希；指纹只表征内容，不证明修改正确。
 * 读取方法返回内部对象或数组引用；readonly 是静态类型约束，不是运行时隔离。
 */

import { createHash } from "node:crypto";
import type { Message, Role, WorkspaceFile } from "./types.js";

export class SharedWorkspace {
  private readonly files = new Map<string, WorkspaceFile>();
  private readonly log: Message[] = [];

  write(path: string, contents: string, writer: Role): WorkspaceFile {
    const prev = this.files.get(path);
    const file: WorkspaceFile = {
      path,
      contents,
      lastWriter: writer,
      revisions: (prev?.revisions ?? 0) + 1,
    };
    this.files.set(path, file);
    return file;
  }

  read(path: string): WorkspaceFile | undefined {
    return this.files.get(path);
  }

  list(): WorkspaceFile[] {
    return [...this.files.values()];
  }

  fingerprint(): string {
    const hasher = createHash("sha256");
    for (const f of [...this.files.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    )) {
      hasher.update(`${f.path}:${f.contents}\n`);
    }
    return hasher.digest("hex").slice(0, 12);
  }

  appendMessage(m: Message): void {
    this.log.push(m);
  }

  messages(): readonly Message[] {
    return this.log;
  }
}
