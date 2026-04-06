const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    items: [
      {
        productId: String,
        title: String,
        price: Number,
        image: String,
        quantity: Number
      }
    ],
    total: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);