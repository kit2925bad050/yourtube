import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    city: { type: String },
    language: { type: String, default: "en" },
    translatedText: { type: String },
    hidden: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    commentedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("comment", commentschema);
