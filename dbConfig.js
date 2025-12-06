import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.MONGO_URL;
const dbName = "node-project";

let client;
let db;

export const connection = async () => {
  if (!url) {
    throw new Error("❌ MONGO_URL is missing");
  }

  if (!client) {
    client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    console.log("✅ MongoDB Connected");
  }

  return db;
};
