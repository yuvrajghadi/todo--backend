import express from "express";
import { collectionName, connection } from "./dbConfig.js";
import cors from "cors";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

/* ------------------ MIDDLEWARE ------------------ */

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(cookieParser());

// Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connection();
    next();
  } catch (err) {
    console.error("❌ Database Error Details:", err);
    return res.status(500).json({ error: "Database connection failed" });
  }
});

/* ------------------ SIGNUP ------------------ */

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.send({ success: false, message: "All fields required" });

    const db = await connection();
    const collection = db.collection("users");

    const exist = await collection.findOne({ email });
    if (exist)
      return res.send({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await collection.insertOne({ email, password: hashedPassword });

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,      // ✅ REQUIRED FOR VERCEL
      sameSite: "none",  // ✅ REQUIRED FOR VERCEL
    });

    res.send({ success: true, message: "Signup successful" });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: "Server error" });
  }
});

/* ------------------ LOGIN ------------------ */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const db = await connection();
    const collection = db.collection("users");

    const user = await collection.findOne({ email });
    if (!user)
      return res.send({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.send({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "5d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.send({ success: true, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.send({ success: false, message: "Server error" });
  }
});

/* ------------------ TOKEN MIDDLEWARE ------------------ */

function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token)
    return res.status(401).send({ success: false, message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
    if (err)
      return res.status(401).send({ success: false, message: "Invalid token" });

    req.user = decode;
    next();
  });
}

/* ------------------ TASK ROUTES ------------------ */

app.post("/add-task", verifyToken, async (req, res) => {
  const db = await connection();
  await db.collection(collectionName).insertOne(req.body);
  res.send({ success: true });
});

app.get("/tasks", verifyToken, async (req, res) => {
  const db = await connection();
  const result = await db.collection(collectionName).find().toArray();
  res.send({ success: true, result });
});

app.get("/task/:id", verifyToken, async (req, res) => {
  const db = await connection();
  const result = await db
    .collection(collectionName)
    .findOne({ _id: new ObjectId(req.params.id) });
  res.send({ success: true, result });
});

app.put("/update-task", verifyToken, async (req, res) => {
  const { _id, ...fields } = req.body;
  const db = await connection();
  const result = await db
    .collection(collectionName)
    .updateOne({ _id: new ObjectId(_id) }, { $set: fields });

  res.send({ success: true, result });
});

app.delete("/delete/:id", verifyToken, async (req, res) => {
  const db = await connection();
  const result = await db
    .collection(collectionName)
    .deleteOne({ _id: new ObjectId(req.params.id) });

  res.send({ success: true, result });
});

app.delete("/delete-multiple", verifyToken, async (req, res) => {
  const db = await connection();
  const ids = req.body.map((id) => new ObjectId(id));
  await db
    .collection(collectionName)
    .deleteMany({ _id: { $in: ids } });

  res.send({ success: true });
});

/* ------------------ LOGOUT ------------------ */

app.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.send({ success: true });
});

/* ✅ REQUIRED FOR VERCEL */
export default app;