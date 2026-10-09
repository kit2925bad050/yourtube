import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  passwordHash: { type: String },
  role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
  resetToken: { type: String },
  resetExpires: { type: Date },
  googleId: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  phone: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  otpMethod: { type: String, enum: ["email", "mobile"], default: "email" },
  otpCode: { type: String },
  otpExpires: { type: Date },
  subscriptionPlan: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD"],
    default: "FREE",
  },
  subscriptionExpiry: { type: Date },
  downloadsToday: { type: Number, default: 0 },
  lastDownloadDate: { type: Date },
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  subscriberCount: { type: Number, default: 0 },
  watchTimeUsedToday: { type: Number, default: 0 },
  lastWatchDate: { type: Date },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
