import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
} from "../controllers/history.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", authenticate, getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", authenticate, handlehistory);
export default routes;
