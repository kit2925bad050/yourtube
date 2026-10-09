import type { NextApiRequest, NextApiResponse } from "next";
import connectDB from "@/lib/db";
import Video from "@/lib/models/Video";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();
    const count = await Video.countDocuments();
    res.status(200).json({ status: "ok", mongodb: "connected", videofilesCount: count });
  } catch (error: any) {
    console.error("/api/health error:", error);
    res.status(500).json({ status: "error", message: error?.message || "Database error" });
  }
}
