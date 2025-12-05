import express from "express";
import { collectionName, connection } from "./dbConfig.js";
import cors from "cors";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());


// ✅ SIGNUP
app.post("/signup", async (req, res) => {
  const userData = req.body;

  if (userData.email && userData.password) {
    const db = await connection();
    const collection = db.collection("users");

    const result = await collection.insertOne(userData);

    if (result) {
      jwt.sign(
        userData,
        process.env.JWT_SECRET,
        { expiresIn: "5d" },
        (err, token) => {
          res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
          });

          res.send({ message: "signup successful", success: true });
        }
      );
    } else {
      res.send({ message: "signup unsuccessful", success: false });
    }
  }
});


// ✅ LOGIN
app.post("/login", async (req, res) => {
  const userData = req.body;

  if (userData.email && userData.password) {
    const db = await connection();
    const collection = db.collection("users");

    const result = await collection.findOne({
      email: userData.email,
      password: userData.password,
    });

    if (result) {
      jwt.sign(
        result,
        process.env.JWT_SECRET,
        { expiresIn: "5d" },
        (err, token) => {
          res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
          });

          res.send({ message: "login successful", success: true });
        }
      );
    } else {
      res.send({ message: "login unsuccessful", success: false });
    }
  }
});


// ✅ ADD TASK
app.post("/add-task", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const result = await collection.insertOne(req.body);

  res.send({ success: true, message: "Task added" });
});


// ✅ GET TASKS
app.get("/tasks", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const result = await collection.find().toArray();

  res.send({ success: true, result });
});


// ✅ GET SINGLE TASK
app.get("/task/:id", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const result = await collection.findOne({
    _id: new ObjectId(req.params.id),
  });

  res.send({ success: true, result });
});


// ✅ UPDATE TASK (SECURED)
app.put("/update-task", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const { _id, ...fields } = req.body;

  const result = await collection.updateOne(
    { _id: new ObjectId(_id) },
    { $set: fields }
  );

  res.send({ success: true, result });
});


// ✅ DELETE TASK
app.delete("/delete/:id", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const result = await collection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.send({ success: true, result });
});


// ✅ DELETE MULTIPLE
app.delete("/delete-multiple", verifyToken, async (req, res) => {
  const db = await connection();
  const collection = db.collection(collectionName);

  const deleteIds = req.body.map((id) => new ObjectId(id));

  const result = await collection.deleteMany({
    _id: { $in: deleteIds },
  });

  res.send({ success: true });
});


// ✅ JWT MIDDLEWARE (FIXED)
function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized user" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "Invalid token" });
    }

    req.user = decode;
    next();
  });
}

export default app;
