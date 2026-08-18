import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as mailController from "./mail.controller.js";

const router = Router();

// Account management & testing
router.post("/accounts", authenticate, mailController.createAccountHandler);
router.get("/accounts", authenticate, mailController.getAccountsHandler);
router.delete("/accounts/:id", authenticate, mailController.deleteAccountHandler);
router.post("/accounts/test-connection", authenticate, mailController.testConnectionHandler);
router.post("/accounts/:id/sync", authenticate, mailController.syncAccountHandler);

// Thread list & details
router.get("/threads", authenticate, mailController.getThreadsHandler);
router.get("/threads/:id", authenticate, mailController.getThreadDetailsHandler);

// AI features
router.post("/threads/:id/categorize", authenticate, mailController.categorizeThreadHandler);
router.post("/categorize-all", authenticate, mailController.categorizeAllHandler);
router.post("/draft", authenticate, mailController.generateDraftHandler);

// Sending mail
router.post("/send", authenticate, mailController.sendEmailHandler);

export default router;
