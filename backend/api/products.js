export default async function handler(req, res) {
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

    res.status(200).json(cleaned);
  } catch (error) {
    console.error("Products fetch error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}