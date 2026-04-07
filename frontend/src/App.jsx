import { useEffect, useMemo, useState } from "react";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [checkout, setCheckout] = useState({
    customerName: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      const res = await fetch(`${API_URL}/api/products`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products", err);
      setMessage("Unable to load product catalog.");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true);
      const res = await fetch(`${API_URL}/api/orders`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  const categories = useMemo(() => {
    const values = products.map((p) => p.category || "General");
    return ["All", ...new Set(values)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: Number(product.price) || 0,
          image: product.image || "",
          quantity: 1
        }
      ];
    });

    setMessage(`${product.title} added to cart.`);
    setTimeout(() => setMessage(""), 1800);
  }

  function changeQuantity(id, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  function handleCheckoutChange(e) {
    const { name, value } = e.target;
    setCheckout((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function placeOrder(e) {
    e.preventDefault();

    if (!checkout.customerName.trim()) {
      setMessage("Full name is required.");
      return;
    }

    if (!checkout.email.trim()) {
      setMessage("Email address is required.");
      return;
    }

    if (!checkout.address.trim()) {
      setMessage("Delivery address is required.");
      return;
    }

    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const payload = {
        customerName: checkout.customerName,
        email: checkout.email,
        address: checkout.address,
        items: cart.map((item) => ({
          productId: String(item.id),
          title: item.title,
          price: item.price,
          image: item.image,
          quantity: item.quantity
        })),
        total: cartSubtotal
      };

      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Checkout failed");
      }

      setMessage("Order placed successfully.");
      setCart([]);
      setCheckout({
        customerName: "",
        email: "",
        address: ""
      });
      loadOrders();
    } catch (err) {
      console.error("Failed to place order", err);
      setMessage(err.message || "Unable to complete checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="store-app">
      <header className="store-hero">
        <div className="hero-copy">
          <span className="hero-badge">Featured Storefront</span>
          <h1>Shop the latest deals with confidence</h1>
          <p>
           Save up to 50% on Latest Austin's Fave
          </p>

          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-value">{products.length}</span>
              <span className="metric-label">Products</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{cartCount}</span>
              <span className="metric-label">Cart Items</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">{orders.length}</span>
              <span className="metric-label">Orders</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-card">
            <p className="mini-label">Today’s Summary</p>
            <h3>It's Easter "He has RISEN!</h3>
            <p className="mini-copy">
              Search by keyword, filter by category, and manage orders
              in one place.
            </p>
          </div>
        </div>
      </header>

      {message && <div className="toast-message">{message}</div>}

      <main className="store-layout">
        <section className="catalog-section card-shell">
          <div className="section-top">
            <div>
              <p className="section-kicker">Product Catalog</p>
              <h2>Browse Inventory</h2>
            </div>
            <span className="section-count">
              {filteredProducts.length} available
            </span>
          </div>

          <div className="catalog-toolbar">
            <input
              type="text"
              placeholder="Search products or descriptions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field"
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {loadingProducts ? (
            <p className="empty-state">Loading product catalog...</p>
          ) : (
            <div className="catalog-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image-wrap">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="product-image"
                    />
                  </div>

                  <div className="product-body">
                    <span className="product-chip">{product.category}</span>
                    <h3>{product.title}</h3>
                    <p className="product-description">
                      {product.description}
                    </p>

                    <div className="product-bottom">
                      <div>
                        <p className="price-label">Unit Price</p>
                        <strong className="product-price">
                          ${Number(product.price).toFixed(2)}
                        </strong>
                      </div>

                      <button
                        className="primary-btn"
                        onClick={() => addToCart(product)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="store-sidebar">
          <section className="card-shell">
            <div className="section-top">
              <div>
                <p className="section-kicker">Shopping Cart</p>
                <h2>Your Basket</h2>
              </div>
              <span className="section-count">{cartCount} item(s)</span>
            </div>

            {cart.length === 0 ? (
              <p className="empty-state">Your cart is empty.</p>
            ) : (
              <>
                <div className="cart-list">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-row">
                      <div className="cart-info">
                        <h4>{item.title}</h4>
                        <p>${item.price.toFixed(2)} each</p>
                      </div>

                      <div className="cart-controls">
                        <button onClick={() => changeQuantity(item.id, -1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="summary-box">
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <strong>${cartSubtotal.toFixed(2)}</strong>
                  </div>
                </div>

                <button className="secondary-btn full-btn" onClick={clearCart}>
                  Clear Cart
                </button>
              </>
            )}
          </section>

          <section className="card-shell">
            <div className="section-top">
              <div>
                <p className="section-kicker">Secure Checkout</p>
                <h2>Customer Details</h2>
              </div>
            </div>

            <form onSubmit={placeOrder} className="checkout-form">
              <input
                className="field"
                type="text"
                name="customerName"
                placeholder="Full name"
                value={checkout.customerName}
                onChange={handleCheckoutChange}
              />

              <input
                className="field"
                type="email"
                name="email"
                placeholder="Email address"
                value={checkout.email}
                onChange={handleCheckoutChange}
              />

              <textarea
                className="field"
                name="address"
                placeholder="Delivery address"
                rows="4"
                value={checkout.address}
                onChange={handleCheckoutChange}
              />

              <button className="primary-btn full-btn" disabled={submitting}>
                {submitting ? "Processing Order..." : "Place Order"}
              </button>
            </form>
          </section>

          <section className="card-shell">
            <div className="section-top">
              <div>
                <p className="section-kicker">Order History</p>
                <h2>Recent Orders</h2>
              </div>
            </div>

            {loadingOrders ? (
              <p className="empty-state">Loading order history...</p>
            ) : orders.length === 0 ? (
              <p className="empty-state">No orders yet.</p>
            ) : (
              <div className="orders-stack">
                {orders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-head">
                      <h4>{order.customerName}</h4>
                      <span className="order-total">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </div>
                    <p>{order.email}</p>
                    <p>{order.address}</p>
                    <p className="order-meta">
                      {order.items?.length || 0} item(s) in this order
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}