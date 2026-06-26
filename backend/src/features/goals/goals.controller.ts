import { Request, Response, NextFunction } from "express";
import {
  createGoalSchema,
  updateGoalSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from "./goals.validator.js";
import {
  createGoal as createGoalService,
  getGoals as getGoalsService,
  getGoal as getGoalService,
  updateGoal as updateGoalService,
  deleteGoal as deleteGoalService,
  addMilestone as addMilestoneService,
  updateMilestone as updateMilestoneService,
  deleteMilestone as deleteMilestoneService,
  aiSuggestMilestones as aiSuggestMilestonesService,
  aiAnalyzeProgress as aiAnalyzeProgressService,
} from "./goals.service.js";

export async function createGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = createGoalSchema.parse(req.body);
    const goal = await createGoalService(userId, data);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function getGoals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const { status, projectId } = req.query;
    const filters: { status?: string; projectId?: string } = {};
    if (typeof status === "string") filters.status = status;
    if (typeof projectId === "string") filters.projectId = projectId;
    const goals = await getGoalsService(userId, filters);
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
}

export async function getGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.params.id as string;
    const goal = await getGoalService(userId, id);
    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function updateGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.params.id as string;
    const data = updateGoalSchema.parse(req.body);
    const goal = await updateGoalService(userId, id, data);
    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function deleteGoal(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.params.id as string;
    await deleteGoalService(userId, id);
    res.status(200).json({ success: true, message: "Goal deleted" });
  } catch (error) {
    next(error);
  }
}

export async function addMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const goalId = req.params.id as string;
    const data = createMilestoneSchema.parse(req.body);
    const milestone = await addMilestoneService(userId, goalId, data);
    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
}

export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const goalId = req.params.id as string;
    const milestoneId = req.params.mid as string;
    const data = updateMilestoneSchema.parse(req.body);
    const milestone = await updateMilestoneService(goalId, milestoneId, data);
    res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
}

export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const goalId = req.params.id as string;
    const milestoneId = req.params.mid as string;
    await deleteMilestoneService(goalId, milestoneId);
    res.status(200).json({ success: true, message: "Milestone deleted" });
  } catch (error) {
    next(error);
  }
}

export async function aiSuggestMilestones(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const goalId = req.params.id as string;
    const milestones = await aiSuggestMilestonesService(userId, goalId);
    res.status(200).json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
}

export async function aiAnalyzeProgress(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const goalId = req.params.id as string;
    const analysis = await aiAnalyzeProgressService(userId, goalId);
    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
}
