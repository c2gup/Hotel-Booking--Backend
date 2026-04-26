import express from "express";
import { query } from "./config/database.js";
import authRoutes from "./routes/auths.js";
import hotels from "./routes/Hotel.routes.js";
import booking from "./routes/booking.routes.js";

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.status(201).send("<h1>HELOO SERVER IS RUNING</h1>");
});

(async () => {
  try {
    const res = await query("SELECT NOW()");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
})();

//routes

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotels);
app.use("/api/bookings", booking);

app.listen(port, async () => {
  console.log(`Server running on ${port}`);
});
