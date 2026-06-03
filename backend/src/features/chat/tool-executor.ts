import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { aiCreateTask } from "../tasks/tasks.service.js";
import { aiCreateHabit } from "../habits/habits.service.js";

interface ToolResult {
  success: boolean
  message: string
}

function uid() { return Math.random().toString(36).slice(2, 9) }

export async function executeToolCall(name: string, params: Record<string, unknown>, userId: string): Promise<ToolResult> {
  const prisma = getPrismaClient();

  switch (name) {
    case "create_habit": {
      const description = typeof params.description === 'string' ? params.description :
        `${params.title || ''}${params.frequency ? ` (${params.frequency})` : ''}`;
      const result = await aiCreateHabit(userId, description).catch(() => null);
      if (!result) return { success: false, message: "Failed to create habit." };
      return { success: true, message: `✓ Created habit "${result.title}" (${result.frequency})` };
    }

    case "create_task": {
      const description = typeof params.description === 'string' ? params.description :
        `${params.title || ''}${params.priority ? ` priority:${params.priority}` : ''}`;
      const result = await aiCreateTask(userId, description).catch(() => null);
      if (!result) return { success: false, message: "Failed to create task." };
      return { success: true, message: `✓ Created task "${result.title}" (${result.priority})` };
    }

    case "mark_task_done": {
      const taskTitle = String(params.title || '');
      const task = await prisma.task.findFirst({
        where: { userId, title: { contains: taskTitle, mode: 'insensitive' }, status: { not: 'done' } },
      });
      if (!task) return { success: false, message: `Could not find an open task matching "${taskTitle}".` };
      await prisma.task.update({ where: { id: task.id }, data: { status: 'done' } });
      return { success: true, message: `✓ Marked task "${task.title}" as done` };
    }

    case "mark_task_undone": {
      const taskTitle = String(params.title || '');
      const task = await prisma.task.findFirst({
        where: { userId, title: { contains: taskTitle, mode: 'insensitive' }, status: 'done' },
      });
      if (!task) return { success: false, message: `Could not find a completed task matching "${taskTitle}".` };
      await prisma.task.update({ where: { id: task.id }, data: { status: 'todo' } });
      return { success: true, message: `✓ Reopened task "${task.title}"` };
    }

    case "update_task_status": {
      const taskTitle = String(params.title || '');
      const newStatus = String(params.status || 'todo');
      const validStatuses = ['todo', 'in-progress', 'done', 'archived'];
      if (!validStatuses.includes(newStatus)) return { success: false, message: `Invalid status "${newStatus}".` };
      const task = await prisma.task.findFirst({
        where: { userId, title: { contains: taskTitle, mode: 'insensitive' } },
      });
      if (!task) return { success: false, message: `Could not find task matching "${taskTitle}".` };
      await prisma.task.update({ where: { id: task.id }, data: { status: newStatus } });
      return { success: true, message: `✓ Updated task "${task.title}" to ${newStatus}` };
    }

    case "create_goal": {
      const prisma = getPrismaClient();
      const title = String(params.title || 'Untitled Goal');
      const description = String(params.description || '');
      const goal = await prisma.goal.create({
        data: { userId, title, description, status: 'active', progress: 0 },
      }).catch(() => null);
      if (!goal) return { success: false, message: "Failed to create goal." };
      await prisma.milestone.create({
        data: { goalId: goal.id, title, description, status: 'pending', order: 1 },
      }).catch(() => {});
      return { success: true, message: `✓ Created goal "${title}"` };
    }

    default:
      return { success: false, message: `Unknown tool: ${name}` };
  }
}

export function parseToolCalls(text: string): { name: string; params: Record<string, unknown>; start: number; end: number }[] {
  const tools: { name: string; params: Record<string, unknown>; start: number; end: number }[] = [];
  const regex = /\[TOOL:(\w+)\]([\s\S]*?)\[END_TOOL\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const rawParams = match[2].trim();
    let params: Record<string, unknown> = {};
    try {
      if (rawParams.startsWith('{')) {
        params = JSON.parse(rawParams);
      } else {
        params = { description: rawParams };
      }
    } catch {
      params = { description: rawParams };
    }
    tools.push({ name, params, start: match.index, end: match.index + match[0].length });
  }
  return tools;
}

export function replaceToolCalls(text: string, results: { placeholder: string; result: string }[]): string {
  let result = text;
  const sorted = [...results].sort((a, b) => result.indexOf(a.placeholder) - result.indexOf(b.placeholder));
  for (const { placeholder, result: replacement } of sorted) {
    result = result.replace(placeholder, replacement);
  }
  return result;
}
