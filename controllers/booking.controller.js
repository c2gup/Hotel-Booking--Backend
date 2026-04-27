import * as z from "zod";
import { pool } from "../config/database.js";
import { query } from "../config/database.js";

const BookingSchema = z.object({
  roomId: z.string(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  guests: z.number(),
});

//learn this
export const booking = async (req, res) => {
  const client = await pool.connect(); // transaction

  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, data: null, error: "UNAUTHORIZED" });
    }

    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, data: null, error: "FORBIDDEN" });
    }

    const userId = req.user.userId;

    const parsedData = BookingSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res
        .status(400)
        .json({ success: false, data: null, error: "INVALID_REQUEST" });
    }

    const { roomId, checkInDate, checkOutDate, guests } = parsedData.data;

    await client.query("BEGIN");

    // 🔹 Get room details
    const roomRes = await client.query(
      "SELECT * FROM rooms WHERE id = $1 FOR UPDATE",
      [roomId],
    );

    if (roomRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, data: null, error: "ROOM_NOT_FOUND" });
    }

    const room = roomRes.rows[0];
    console.log("Rooms detaiuls", room);

    // 🔹 Owner booking check
    if (room.owner_id === userId) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ success: false, data: null, error: "FORBIDDEN" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    const checkOut = new Date(checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    if (checkIn < today || checkOut <= checkIn) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        data: null,
        error: "INVALID_DATES",
      });
    }

    // 🔹 Capacity check
    if (guests > room.capacity) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, data: null, error: "INVALID_CAPACITY" });
    }

    // 🔹 Overlapping booking check
    const overlap = await client.query(
      `SELECT 1 FROM bookings 
       WHERE room_id = $1 
       AND status = 'confirmed'
       AND NOT (check_out_date <= $2 OR check_in_date >= $3)`,
      [roomId, checkInDate, checkOutDate],
    );

    if (overlap.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, data: null, error: "ROOM_NOT_AVAILABLE" });
    }

    // 🔹 Price calculation
    const nights = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);

    const totalPrice = nights * room.price_per_night;

    const result = await client.query(
      `INSERT INTO bookings 
      ( user_id, room_id,  check_in_date, check_out_date, guests, total_price)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [userId, roomId, checkInDate, checkOutDate, guests, totalPrice],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      error: null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    return res.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
    });
  } finally {
    client.release();
  }
};

//learn this
export const getBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
      });
    }

    const userId = req.user.userId;

    const result = await query(
      `SELECT 
        b.id,
        b.room_id AS "roomId",
        r.hotel_id AS "hotelId",
        h.name AS "hotelName",
        r.room_number AS "roomNumber",
        r.room_type AS "roomType",
        b.check_in_date AS "checkInDate",
        b.check_out_date AS "checkOutDate",
        b.guests,
        b.total_price AS "totalPrice",
        b.status,
        b.booking_date AS "bookingDate"
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE b.user_id = $1
      ORDER BY b.booking_date DESC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      error: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      data: null,
      error: "Internal Server Error",
    });
  }
};

export const bookingCancle = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
      });
    }
    const bookId = req.params.bookingId;

    if (!bookId) {
      return res.status().json({
        success: false,
        data: null,
        error: "BOOKING_NOT_FOUND",
      });
    }
    const result = await query(`SELECT * FROM bookings WHERE id = $1`, [
      bookId,
    ]);
    console.log(result.rows[0]);
    if (req.user.userId !== result.rows[0].user_id) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }

    // 4. Ownership check
    if (req.user.userId !== booking.user_id) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }

    // 5. Already cancelled check
    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        data: null,
        error: "ALREADY_CANCELLED",
      });
    }

    const now = new Date();
    const checkIn = new Date(booking.check_in_date);

    const diffInMs = checkIn - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "CANCELLATION_DEADLINE_PASSED",
      });
    }

    // 7. Update booking
    const updated = await query(
      `UPDATE bookings 
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1
       RETURNING id, status, cancelled_at`,
      [bookId],
    );

    const updatedBooking = updated.rows[0];

    // 8. Success response
    return res.status(200).json({
      success: true,
      data: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        cancelledAt: updatedBooking.cancelled_at,
      },
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
