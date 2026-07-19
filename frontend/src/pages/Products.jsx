import { useState, useEffect } from 'react';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    price: '',
    quantity_in_stock: '',
    low_stock_alert: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = () => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: formData.product_name,
          category: formData.category,
          price: parseFloat(formData.price),
          quantity_in_stock: parseInt(formData.quantity_in_stock),
          low_stock_alert: parseInt(formData.low_stock_alert) || 10
        })
      });

      if (!res.ok) throw new Error('Failed to add product');

      setFormData({
        product_name: '',
        category: '',
        price: '',
        quantity_in_stock: '',
        low_stock_alert: ''
      });

      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Error adding product. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`"${name}" delete karanna sure da?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete product');

      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Error deleting product. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading products...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>📦</span>
        <h1>Products</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="product_name"
          placeholder="Product Name"
          value={formData.product_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="quantity_in_stock"
          placeholder="Stock Qty"
          value={formData.quantity_in_stock}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="low_stock_alert"
          placeholder="Low Stock Alert"
          value={formData.low_stock_alert}
          onChange={handleChange}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add Product'}
        </button>
      </form>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price (Rs.)</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.product_name}</td>
                <td>{product.category}</td>
                <td>{Number(product.price).toLocaleString()}</td>
                <td className={product.quantity_in_stock <= product.low_stock_alert ? 'low-stock' : 'in-stock'}>
                  {product.quantity_in_stock}
                </td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(product.id, product.product_name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Products;