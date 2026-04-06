import { useEffect, useMemo, useState } from "react";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkout, setCheckout] = useState({
    customerName: "",
    email: "",
    address: ""
  });

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setMessage("Could not load products"))
      .finally(() => setLoading(false));

    loadOrders();
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);

      if (found) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id, type) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: type === "inc" ? item.quantity + 1 : item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleCheckout = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!cart.length) {
      setMessage("Your cart is empty.");
      return;
    }

    const payload = {
      ...checkout,
      items: cart.map((item) => ({
        productId: String(item.id),
        title: item.title,
        price: item.price,
        image: item.image,
        quantity: item.quantity
      })),
      total
    };

    try {
      setSubmitting(true);

      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Checkout failed");
      }

      setMessage(`Order placed successfully. Order ID: ${data.orderId}`);
      setCart([]);
      localStorage.removeItem("cart");
      setCheckout({
        customerName: "",
        email: "",
        address: ""
      });
      loadOrders();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">MERN + Azure</p>
          <h1>NovaShop</h1>
          <p className="hero-text">
            A clean starter e-commerce store built with React, Express, Node,
            MongoDB, and Azure deployment in mind.
          </p>
        </div>
        <div className="hero-card">
          <h3>Cart Summary</h3>
          <p>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
          <p className="price">${total.toFixed(2)}</p>
        </div>
      </header>

      <main className="layout">
        <section>
          <h2>Featured Products</h2>

          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {loading ? (
            <p>Loading products...</p>
          ) : (
            <div className="grid">
              {filteredProducts.map((product) => (
                <div className="card" key={product.id}>
                  <img src={product.image} alt={product.title} />
                  <div className="card-body">
                    <p className="category">{product.category}</p>
                    <h3>{product.title}</h3>
                    <p className="desc">
                      {product.description?.slice(0, 90)}...
                    </p>
                    <div className="card-footer">
                      <span>${product.price}</span>
                      <button onClick={() => addToCart(product)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="sidebar">
          <div className="panel">
            <h2>Your Cart</h2>
            {cart.length === 0 ? (
              <p>No items yet.</p>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.title} />
                  <div>
                    <h4>{item.title}</h4>
                    <p>${item.price}</p>
                    <div className="qty">
                      <button onClick={() => updateQty(item.id, "dec")}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, "inc")}>+</button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
            <hr />
            <p className="total">Total: ${total.toFixed(2)}</p>
          </div>

          <form className="panel" onSubmit={handleCheckout}>
            <h2>Checkout</h2>
            <input
              type="text"
              placeholder="Full name"
              value={checkout.customerName}
              onChange={(e) =>
                setCheckout({ ...checkout, customerName: e.target.value })
              }
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={checkout.email}
              onChange={(e) =>
                setCheckout({ ...checkout, email: e.target.value })
              }
              required
            />
            <textarea
              placeholder="Delivery address"
              value={checkout.address}
              onChange={(e) =>
                setCheckout({ ...checkout, address: e.target.value })
              }
              required
            />
            <button type="submit" className="checkout-btn" disabled={submitting}>
              {submitting ? "Placing Order..." : "Place Order"}
            </button>
            {message && <p className="message">{message}</p>}
          </form>
        </aside>
      </main>

      <section className="panel recent-orders">
        <h2>Recent Orders</h2>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="order-card">
              <h4>{order.customerName}</h4>
              <p>{order.email}</p>
              <p>{order.address}</p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(order.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Total:</strong> ${order.total}
              </p>
              <hr />
            </div>
          ))
        )}
      </section>
    </div>
  );
}