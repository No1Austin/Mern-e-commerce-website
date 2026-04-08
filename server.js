const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Order = require("./backend/models/order");

dotenv.config();

const app = express();

/* CORS */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

/* MongoDB - avoid opening multiple connections in serverless */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });
    isConnected = conn.connections[0].readyState === 1;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
}

/* Ensure DB connection before routes that need it */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed" });
  }
});

/* Health check */
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, message: "Backend is running" });
});

/* External products API */
app.get("/api/products", async (req, res) => {
  try {
    const response = await fetch("https://api.escuelajs.co/api/v1/products");

    if (!response.ok) {
      return res.status(502).json({
        message: "Failed to fetch external product catalog",
      });
    }

    const data = await response.json();

    const cleaned = data.slice(0, 12).map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      description: item.description,
      image:
        Array.isArray(item.images) && item.images.length > 0
          ? item.images[0]
          : "",
      category: item.category?.name || "General",
    }));

    res.json(cleaned);
  } catch (error) {
    console.error("Products fetch error:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* Create order */
app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, email, address, items, total } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!address?.trim()) {
      return res.status(400).json({ message: "Address is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    if (typeof total !== "number" || total <= 0) {
      return res.status(400).json({ message: "Total must be greater than 0" });
    }

    const order = await Order.create({
      customerName,
      email,
      address,
      items,
      total,
    });

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Order save error:", error.message);
    res.status(500).json({ message: "Failed to save order" });
  }
});

/* Get orders */
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Orders fetch error:", error.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* Optional DB write test */
app.get("/api/test-write", async (req, res) => {
  try {
    const testOrder = await Order.create({
      customerName: "Test User",
      email: "test@email.com",
      address: "Test Address",
      items: [
        {
          productId: "1",
          title: "Test Product",
          price: 100,
          image: "",
          quantity: 1,
        },
      ],
      total: 100,
    });

    res.json({ message: "Test order saved", testOrder });
  } catch (err) {
    console.error("Test write error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* API 404 */
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

/* Only listen locally, not on Vercel */
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;