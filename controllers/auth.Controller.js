import { query } from "../config/database.js";
import bcrypt from "bcrypt";
import * as z from "zod";

// 1. Zod schema (validation only)
const userSchema = z.object({
  name: z.string().max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
  phone: z.string().optional(),
});

export const signUp = async (req, res) => {
  try {
    // 2. Validate request body
    const parsed = userSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }

    const { name, email, password, role, phone } = parsed.data;

    // 3. Check existing user
    const existingUser = await query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert user
    const result = await query(
      `INSERT INTO users (name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone`,
      [name, email, hashedPassword, role, phone],
    );

    // 6. Response
    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signup failed" });
  }
};
