import express from "express";
import {
  createOrder,
  verifyPayment,
  getSubscription,
  getInvoices,
} from "../controllers/payment.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/create-order", authenticate, createOrder);
routes.post("/verify", authenticate, verifyPayment);
routes.get("/subscription/:userId", authenticate, getSubscription);
routes.get("/invoices/:userId", authenticate, getInvoices);

export default routes;
