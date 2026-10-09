import dns from "dns";
import mongoose from "mongoose";

const DEFAULT_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;

  const uri = process.env.DB_URL as string;
  if (!uri) {
    throw new Error("Please define the DB_URL environment variable");
  }

  if (uri.startsWith("mongodb+srv://")) {
    const customServers = process.env.MONGO_DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
    dns.setServers(customServers?.length ? customServers : DEFAULT_DNS_SERVERS);
  }

  await mongoose.connect(uri);
};

export default connectDB;
