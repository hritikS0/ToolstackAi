import { Request, Response, NextFunction } from "express";
import { createNoteSchema, updateNoteSchema } from "./notes.validator.js";
import * as notesService from "./notes.service.js";

function getParamId(req: Request): string {
  return typeof req.params.id === "string" ? req.params.id : req.params.id[0];
}

export async function createNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = createNoteSchema.parse(req.body);
    const note = await notesService.createNote(userId, data);
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
}

export async function getNotesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { search, tag, projectId } = req.query;
    const notes = await notesService.getNotes(userId, {
      search: typeof search === "string" ? search : undefined,
      tag: typeof tag === "string" ? tag : undefined,
      projectId: typeof projectId === "string" ? projectId : undefined,
    });
    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
}

export async function getNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const note = await notesService.getNote(userId, getParamId(req));
    res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
}

export async function updateNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = updateNoteSchema.parse(req.body);
    const note = await notesService.updateNote(userId, getParamId(req), data);
    res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
}

export async function deleteNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    await notesService.deleteNote(userId, getParamId(req));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function summarizeNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await notesService.summarizeNote(userId, getParamId(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function extractTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await notesService.extractTasksFromNote(userId, getParamId(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function searchNotesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const query = typeof req.query.q === "string" ? req.query.q : "";
    if (!query) return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    const result = await notesService.searchNotes(userId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
