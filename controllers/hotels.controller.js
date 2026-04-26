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

export const getHotelDetail = async (req, res) => {
  try {
    const hotelId = req.params.hotelId;

    const result = await query(
      `SELECT 
        h.id AS hotel_id,
        h.owner_id,
        h.name,
        h.description,
        h.city,
        h.country,
        h.amenities,
        h.rating,
        h.total_reviews,

        r.id AS room_id,
        r.room_number,
        r.room_type,
        r.price_per_night,
        r.max_occupancy

      FROM hotels h
      LEFT JOIN rooms r 
      ON h.id = r.hotel_id
      WHERE h.id = $1`,
      [hotelId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: "HOTEL_NOT_FOUND",
      });
    }

    // 🧠 Build response
    const hotel = {
      id: result.rows[0].hotel_id,
      ownerId: result.rows[0].owner_id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      city: result.rows[0].city,
      country: result.rows[0].country,
      amenities: result.rows[0].amenities,
      rating: result.rows[0].rating,
      totalReviews: result.rows[0].total_reviews,
      rooms: [],
    };

    // loop rooms
    result.rows.forEach((row) => {
      if (row.room_id) {
        hotel.rooms.push({
          id: row.room_id,
          roomNumber: row.room_number,
          roomType: row.room_type,
          pricePerNight: row.price_per_night,
          maxOccupancy: row.max_occupancy,
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: hotel,
      error: null,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};
