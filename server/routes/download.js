import express from "express";
import {
  downloadVideo,
  getDownloadHistory,
  getDownloadCount,
} from "../controllers/download.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/:videoId", authenticate, downloadVideo);
routes.get("/history/:userId", authenticate, getDownloadHistory);
routes.get("/count/:userId", authenticate, getDownloadCount);

export default routes;
