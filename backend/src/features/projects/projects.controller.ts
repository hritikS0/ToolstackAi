import { Request, Response, NextFunction } from "express";
import { createProjectSchema, updateProjectSchema } from "./projects.validator.js";
import {
  createProject as createProjectService,
  getProjects as getProjectsService,
  getProject as getProjectService,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
} from "./projects.service.js";

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = createProjectSchema.parse(req.body);
    const project = await createProjectService(userId, data);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const projects = await getProjectsService(userId);
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const id = req.params.id as string;
    const project = await getProjectService(userId, id);
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const id = req.params.id as string;
    const data = updateProjectSchema.parse(req.body);
    const project = await updateProjectService(userId, id, data);
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const id = req.params.id as string;
    await deleteProjectService(userId, id);
    res.status(200).json({ success: true, message: "Project deleted" });
  } catch (error) {
    next(error);
  }
}
