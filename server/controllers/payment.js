import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import invoice from "../Modals/invoice.js";
import nodemailer from "nodemailer";
import { getIo } from "../socket/index.js";

const PLANS = {
  BRONZE: { amount: 1000, watchLimit: 7 },
  SILVER: { amount: 5000, watchLimit: 10 },
  GOLD: { amount: 10000, watchLimit: Infinity },
};

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function sendInvoiceEmail(user, plan, amount) {
  try {
    if (!process.env.SMTP_USER) {
      console.log(`Invoice email (mock): ${user.email} - ${plan} - ₹${amount / 100}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `YourTube ${plan} Subscription Invoice`,
      text: `Thank you for subscribing to ${plan} plan for ₹${amount / 100}. Enjoy YourTube Premium!`,
    });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

export const createOrder = async (req, res) => {
  const userId = req.userId || req.body.userId;
  const { plan } = req.body;
  const planConfig = PLANS[plan];
  if (!planConfig) {
    return res.status(400).json({ message: "Invalid plan" });
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({ message: "Payment gateway not configured" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const receipt = `rcpt_${userId.slice(-8)}_${crypto.randomBytes(4).toString("hex")}`;
    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: "INR",
      receipt,
    });
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return res.status(500).json({ message: "Payment order failed" });
  }
};

export const verifyPayment = async (req, res) => {
  const userId = req.userId || req.body.userId;
  const {
    plan,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

  const planConfig = PLANS[plan];
  if (!planConfig) return res.status(400).json({ message: "Invalid plan" });

  // Require server-side Razorpay configuration and a valid signature
  const razorpay = getRazorpay();
  if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ message: "Payment gateway not configured" });
  }

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: "Missing payment verification fields" });
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  if (expected !== razorpaySignature) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    user.subscriptionPlan = plan;
    user.subscriptionExpiry = expiry;
    await user.save();

    const inv = await invoice.create({
      userId,
      plan,
      amount: planConfig.amount / 100,
      razorpayOrderId,
      razorpayPaymentId,
      email: user.email,
    });

    await sendInvoiceEmail(user, plan, planConfig.amount);

    // emit subscription change
    try {
      getIo()?.emit("subscription:updated", { userId, plan });
    } catch (err) {
      console.error("Failed to emit subscription event:", err);
    }

    return res.status(200).json({
      success: true,
      plan,
      invoice: inv,
      message: `Upgraded to ${plan} plan successfully`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

export const getSubscription = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      plan: user.subscriptionPlan || "FREE",
      expiry: user.subscriptionExpiry,
      plans: {
        FREE: { price: 0, watchLimit: 5 },
        BRONZE: { price: 10, watchLimit: 7 },
        SILVER: { price: 50, watchLimit: 10 },
        GOLD: { price: 100, watchLimit: "Unlimited" },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getInvoices = async (req, res) => {
  const userId = req.userId || req.params.userId;
  try {
    const invoices = await invoice.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(invoices);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
