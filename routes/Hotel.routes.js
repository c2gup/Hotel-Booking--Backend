import express from "express";
import { createNewHotel } from "../controllers/hotels.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, createNewHotel);

export default router;
