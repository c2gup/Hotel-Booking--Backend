import express from "express";
import { booking, getBooking } from "../controllers/booking.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, booking);
router.get("/", authMiddleware, getBooking);

export default router;
