import express from "express";
import {
  booking,
  getBooking,
  bookingCancle,
} from "../controllers/booking.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, booking);
router.get("/", authMiddleware, getBooking);
router.put("/:bookingId/cancel", authMiddleware, bookingCancle);

export default router;
