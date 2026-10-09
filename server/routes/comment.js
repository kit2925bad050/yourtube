import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likeComment,
  dislikeComment,
  translateComment,
  replyComment,
  unhidecomment,
} from "../controllers/comment.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.get("/getall", authenticate, getallcomment);
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", authenticate, postcomment);
routes.delete("/deletecomment/:id", authenticate, deletecomment);
routes.delete("/delete/:id", authenticate, deletecomment);
routes.put("/unhide/:id", authenticate, unhidecomment);
routes.post("/editcomment/:id", authenticate, editcomment);
routes.post("/like/:id", authenticate, likeComment);
routes.post("/dislike/:id", authenticate, dislikeComment);
routes.post("/translate/:id", authenticate, translateComment);
routes.post("/reply/:id", authenticate, replyComment);

export default routes;
