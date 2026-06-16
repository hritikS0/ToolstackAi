import { Router } from "express";
import { register, login, updateProfile, changePassword } from "./auth.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.put("/me", authenticate, updateProfile);
router.put("/password", authenticate, changePassword);
export default router;
