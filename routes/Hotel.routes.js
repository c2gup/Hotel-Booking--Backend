import express from "express";
import {
  createNewHotel,
  addroomByOwner,
} from "../controllers/hotels.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, createNewHotel);
router.post("/:hotelId/rooms", authMiddleware, addroomByOwner);

export default router;
