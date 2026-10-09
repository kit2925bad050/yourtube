import { app, ensureDbConnected } from "../app.js";

export default async function handler(req, res) {
  try {
    await ensureDbConnected();
    return app(req, res);
  } catch (err) {
    console.error("Serverless handler error:", err.message || err);
    res.status(500).json({ message: "Server error" });
  }
}
