import express from "express";

const route = express.Router();
import { reviews } from "../controllers/reviews.Controller.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

route.post("/", authMiddleware, reviews);

export default route;
