import { query } from "../config/database.js";
import * as z from "zod";

export const HotelSchema = z.object({
  name: z.string().min(3).max(100),

  description: z.string().min(10).max(1000),

  city: z.string().min(2).max(100),

  country: z.string().min(2).max(100),

  amenities: z.array(z.string()).default([]),
});

export const createNewHotel = async (req, res) => {
  try {
    console.log(req.user.role);

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only owners can create hotels",
      });
    }
    const PasredData = HotelSchema.safeParse(req.body);
    if (!PasredData.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }
    const { name, description, city, country, amenities } = PasredData.data;

    const result = await query(
      `INSERT INTO hotels (owner_id, name, description, city, country, amenities)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, owner_id, name, description, city, country, amenities,rating,total_reviews`,
      [
        req.user.userId, // 👈 THIS IS WHAT YOU WANT
        name,
        description,
        city,
        country,
        JSON.stringify(amenities),
      ],
    );

    res.status(201).json({
      message: "Hotel created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signup failed" });
  }
};
