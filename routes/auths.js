import express from "express";
import { signUp } from "../controllers/auth.Controller.js";

const router = express.Router();

// signup route
router.post("/signup", signUp);

export default router;
