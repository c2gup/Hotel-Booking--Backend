import express from "express";
import { booking } from "../controllers/booking.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, booking);

export default router;
