import { query } from "../config/database.js";
import bcrypt from "bcrypt";
import * as z from "zod";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
dotenv.config();

const userSchema = z.object({
  name: z.string().max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
  phone: z.string().optional(),
});

const userSchemaLogin = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUp = async (req, res) => {
  try {
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

export const login = async (req, res) => {
  const parsed = userSchemaLogin.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors,
    });
  }

  try {
    const { email, password } = parsed.data;

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role, // 👈 add this
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // 3. Success
    res.status(200).json({
      success: true,
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};
