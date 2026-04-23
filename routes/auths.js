import express from "express";
import { signUp, login } from "../controllers/auth.Controller.js";

const router = express.Router();

// signup route
router.post("/signup", signUp);
router.post("/login", login);

export default router;
