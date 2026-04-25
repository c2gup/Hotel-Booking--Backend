import { query } from "../config/database.js";
import * as z from "zod";

const addRoomSchema = z.object({
  roomNumber: z.string(),
  roomType: z.string().max(200),

  pricePerNight: z.number(),
  maxOccupancy: z.number(),
});

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
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }
    const PasredData = HotelSchema.safeParse(req.body);
    if (!PasredData.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: PasredData.error.errors,
      });
    }
    const { name, description, city, country, amenities } = PasredData.data;

    const result = await query(
      `INSERT INTO hotels (owner_id, name, description, city, country, amenities)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, owner_id, name, description, city, country, amenities,rating,total_reviews`,
      [
        req.user.userId,
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

export const addroomByOwner = async (req, res) => {
  try {
    //auth check krna
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
      });
    }

    if (req.user.role !== "owner") {
      return res.status(401).json({
        success: false,
        data: null,

        error: "FORBIDDEN",
      });
    }

    //Hotel check

    const hotelId = req.params.hotelId;
    console.log("id--> hotel", hotelId);

    const hotel = await query("SELECT * FROM hotels WHERE id = $1", [hotelId]);

    if (hotel.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: "HOTEL_NOT_FOUND",
      });
    }

    if (hotel.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }

    const PasredRoomData = addRoomSchema.safeParse(req.body);

    if (!PasredRoomData.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: PasredRoomData.error.errors,
      });
    }

    const { roomNumber, roomType, pricePerNight, maxOccupancy } =
      PasredRoomData.data;

    const result = await query(
      `INSERT INTO rooms (hotel_id,  room_number, room_type , price_per_night, max_occupancy)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, hotel_id, room_number, room_type , price_per_night, max_occupancy`,
      [hotelId, roomNumber, roomType, pricePerNight, maxOccupancy],
    );

    res.status(200).json({
      success: true,
      data: result.rows[0],
      error: null,
    });
  } catch (error) {
    console.error("DB ERROR:", error.code);

    if (
      error.code === "23505" &&
      error.constraint === "rooms_hotel_id_room_number_key"
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "ROOM_ALREADY_EXISTS",
      });
    }

    return res.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};
