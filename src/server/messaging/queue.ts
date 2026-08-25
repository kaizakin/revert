import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { after } from "next/server";

import { db } from "@/server/db";
import {
  conversationMembers,
  mentions,
  messages,
  users,
} from "@/server/db/schema";

export const MENTION_ALL = "all";

export interface QueuedMessageTask {
  id: string;
  conversationId: string;
  authorId: string;
  kind: "text";
  body: string;
  replyToId: string | null;
  createdAt: Date;
  handles: string[];
}

/**
 * In-memory FIFO queue per conversation to guarantee that messages in the same
 * room are persisted to Postgres in strict chronological order without race conditions.
 */
class MessagePersistenceQueue {
  private queues = new Map<string, QueuedMessageTask[]>();
  private activeWorkers = new Set<string>();

  /** Enqueue a message task and trigger the background worker */
  enqueue(task: QueuedMessageTask): void {
    const queue = this.queues.get(task.conversationId) ?? [];
    queue.push(task);
    this.queues.set(task.conversationId, queue);

    const scheduleWorker = () => {
      void this.processConversation(task.conversationId);
    };

    try {
      // Use Next.js after() to keep the serverless lifecycle alive until the task finishes
      after(scheduleWorker);
    } catch {
      // Fallback for non-request contexts or direct server calls
      if (typeof setImmediate !== "undefined") {
        setImmediate(scheduleWorker);
      } else {
        setTimeout(scheduleWorker, 0);
      }
    }
  }

  /** Drain the queue for a conversation sequentially */
  private async processConversation(conversationId: string): Promise<void> {
    if (this.activeWorkers.has(conversationId)) {
      return;
    }

    this.activeWorkers.add(conversationId);

    try {
      while (true) {
        const queue = this.queues.get(conversationId);
        if (!queue || queue.length === 0) {
          this.queues.delete(conversationId);
          break;
        }

        const task = queue.shift()!;
        await this.persistWithRetry(task, 3);
      }
    } finally {
      this.activeWorkers.delete(conversationId);
    }
  }

  /** Persist a single message with exponential backoff on transient errors */
  private async persistWithRetry(task: QueuedMessageTask, maxRetries = 3): Promise<void> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await this.persistMessage(task);
        return;
      } catch (error) {
        attempt++;
        console.error(
          `[queue] Failed to persist message ${task.id} (attempt ${attempt}/${maxRetries}):`,
          error,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
  }

  /** Database write transaction for message and associated mentions */
  private async persistMessage(task: QueuedMessageTask): Promise<void> {
    await db.transaction(async (tx) => {
      // Insert the message row with the pre-assigned ID and timestamp
      const [inserted] = await tx
        .insert(messages)
        .values({
          id: task.id,
          conversationId: task.conversationId,
          authorId: task.authorId,
          kind: task.kind,
          body: task.body,
          replyToId: task.replyToId,
          createdAt: task.createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: messages.id });

      // If already inserted (e.g. retry), row exists
      const messageId = inserted?.id ?? task.id;

      if (task.handles.length > 0) {
        const mentionsAll = task.handles.includes(MENTION_ALL);
        const named = task.handles.filter((h) => h !== MENTION_ALL);

        const mentioned = mentionsAll
          ? await tx
              .select({ id: users.id })
              .from(conversationMembers)
              .innerJoin(users, eq(users.id, conversationMembers.userId))
              .where(
                and(
                  eq(conversationMembers.conversationId, task.conversationId),
                  ne(conversationMembers.userId, task.authorId),
                  isNull(users.deletedAt),
                ),
              )
          : named.length
            ? await tx
                .select({ id: users.id })
                .from(users)
                .where(and(inArray(users.username, named), isNull(users.deletedAt)))
            : [];

        if (mentioned.length > 0) {
          await tx
            .insert(mentions)
            .values(mentioned.map((m) => ({ messageId, userId: m.id })))
            .onConflictDoNothing();
        }
      }
    });
  }
}

// Global singleton instance
const globalForQueue = globalThis as unknown as {
  messageQueue?: MessagePersistenceQueue;
};

export const messageQueue =
  globalForQueue.messageQueue ?? new MessagePersistenceQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.messageQueue = messageQueue;
}
