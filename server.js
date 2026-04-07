const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const Order = require("./models/Order");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*"
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

app.get("/api/products", async (req, res) => {
  try {
    const response = await fetch("https://api.escuelajs.co/api/v1/products");
    const data = await response.json();

    const cleaned = data.slice(0, 12).map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      description: item.description,
      image: Array.isArray(item.images) ? item.images[0] : "",
      category: item.category?.name || "General"
    }));

    res.json(cleaned);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

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
      total
    });

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

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
          quantity: 1
        }
      ],
      total: 100
    });

    res.json({ message: "Test order saved", testOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* serve frontend */
app.use(express.static(path.join(__dirname, "public")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});