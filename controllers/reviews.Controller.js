import { query } from "../config/database.js";

export const reviews = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "UNAUTHORIZED",
      });
    }

    const { bookingId, rating, comment } = req.body;

    const checkBooking = await query(`SELECT * FROM bookings WHERE id = $1`, [
      bookingId,
    ]);

    if (checkBooking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: "BOOKING_NOT_FOUND",
      });
    }

    const booking = checkBooking.rows[0];

    if (booking.user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: "FORBIDDEN",
      });
    }

    if (
      booking.status !== "confirmed" ||
      new Date(booking.check_out_date) > new Date()
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "BOOKING_NOT_ELIGIBLE",
      });
    }

    const result = await query(
      `INSERT INTO reviews (user_id, hotel_id, booking_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.userId, booking.hotel_id, bookingId, rating, comment],
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      error: null,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        data: null,
        error: "ALREADY_REVIEWED",
      });
    }

    return res.status(500).json({
      success: false,
      data: null,
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};
