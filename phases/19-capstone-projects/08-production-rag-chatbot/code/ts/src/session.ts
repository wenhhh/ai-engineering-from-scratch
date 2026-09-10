/**
 * 以 sessionId 为键的内存会话存储，不是持久化数据库。
 * 同一 ID 返回原对象，并忽略后续传入的角色与管辖区；没有身份核验或访问授权。
 * list 和 get 返回可变对象的引用，调用方修改它们会影响存储；进程重启后数据丢失。
 */

import type { Session, Turn } from "./types.js";

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  getOrCreate(id: string, role: string, jurisdiction: string): Session {
    const existing = this.sessions.get(id);
    // 复用既有会话，包括其最初的角色与管辖区；这里不检查请求是否有权使用该 ID。
    if (existing) return existing;
    const session: Session = {
      id,
      role,
      jurisdiction,
      turns: [],
      createdAt: Date.now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  appendTurn(id: string, turn: Turn): void {
    const session = this.sessions.get(id);
    // 不存在的会话 ID 被静默忽略，不抛异常也不自动创建。
    if (!session) return;
    session.turns.push(turn);
  }

  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  size(): number {
    return this.sessions.size;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }
}
