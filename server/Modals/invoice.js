import mongoose from "mongoose";

const invoiceschema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: { type: String, default: "paid" },
    email: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("invoice", invoiceschema);
