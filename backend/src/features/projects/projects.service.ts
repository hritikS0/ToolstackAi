import { getPrismaClient } from "../../shared/db/prismaClient.js";

async function verifyProjectOwnership(projectId: string, userId: string) {
  const prisma = getPrismaClient();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }
  if (project.userId !== userId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 403 });
  }
  return project;
}

export async function getProjects(userId: string) {
  const prisma = getPrismaClient();
  return prisma.project.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          tasks: true,
          goals: true,
          habits: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(userId: string, id: string) {
  await verifyProjectOwnership(id, userId);
  const prisma = getPrismaClient();
  return prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
      },
      goals: {
        orderBy: { createdAt: "desc" },
      },
      habits: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createProject(
  userId: string,
  data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  },
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description || "",
        color: data.color || "#f59e0b",
        icon: data.icon || "folder",
      },
    });

    // Automatically create a matching Memory with category "Projects" using the project's ID
    await tx.memory.create({
      data: {
        id: project.id, // Shared ID
        userId,
        title: project.name,
        content: project.description || project.name,
        category: "Projects",
        importance: 4,
        confidence: 1.0,
        source: "projects-module",
      },
    });

    return project;
  });
}

export async function updateProject(
  userId: string,
  id: string,
  data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  },
) {
  await verifyProjectOwnership(id, userId);
  const prisma = getPrismaClient();

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.icon !== undefined) updateData.icon = data.icon;

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: updateData,
    });

    // Sync memory update
    const memoryUpdateData: Record<string, any> = {};
    if (data.name !== undefined) memoryUpdateData.title = data.name;
    if (data.description !== undefined) memoryUpdateData.content = data.description || data.name;

    if (Object.keys(memoryUpdateData).length > 0) {
      await tx.memory.update({
        where: { id },
        data: memoryUpdateData,
      });
    }

    return project;
  });
}

export async function deleteProject(userId: string, id: string) {
  await verifyProjectOwnership(id, userId);
  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    // Delete project
    await tx.project.delete({
      where: { id },
    });

    // Delete matching memory using deleteMany to avoid throwing if memory record is missing
    await tx.memory.deleteMany({
      where: { id },
    });
  });
}
