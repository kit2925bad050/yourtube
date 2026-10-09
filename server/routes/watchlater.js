import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
} from "../controllers/watchlater.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", authenticate, getallwatchlater);
routes.post("/:videoId", authenticate, handlewatchlater);
export default routes;
