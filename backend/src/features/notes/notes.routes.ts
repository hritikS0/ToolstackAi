import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as notesController from "./notes.controller.js";

const router = Router();

router.post("/", authenticate, notesController.createNoteHandler);
router.get("/", authenticate, notesController.getNotesHandler);
router.get("/search", authenticate, notesController.searchNotesHandler);
router.get("/:id", authenticate, notesController.getNoteHandler);
router.patch("/:id", authenticate, notesController.updateNoteHandler);
router.delete("/:id", authenticate, notesController.deleteNoteHandler);
router.post("/:id/summarize", authenticate, notesController.summarizeNoteHandler);
router.post("/:id/extract-tasks", authenticate, notesController.extractTasksHandler);

export default router;
