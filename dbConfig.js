import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.MONGO_URL;
const dbName = "node-project";
export const collectionName = "todo";

let client;
let db;

export const connection = async () => {
  if (!url) {
    console.error("❌ FATAL ERROR: MONGO_URL is missing in .env file");
    throw new Error("Missing MongoDB Connection URL");
  }

  try {
    if (!client) {
      client = new MongoClient(url);
      await client.connect();
      db = client.db(dbName);
      console.log("✅ Connected to MongoDB");
    }
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
};
