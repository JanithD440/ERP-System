import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';

function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    price: '',
    quantity_in_stock: '',
    low_stock_alert: '',
    barcode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const fetchCategories = () => {
    fetch('http://localhost:5000/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error('Error fetching categories:', err));
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateBarcode = () => {
    // Generate a simple random 12-digit barcode
    const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setFormData({ ...formData, barcode: randomBarcode });
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: '',
      price: '',
      quantity_in_stock: '',
      low_stock_alert: '',
      barcode: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      product_name: formData.product_name,
      category: formData.category,
      price: parseFloat(formData.price),
      quantity_in_stock: parseInt(formData.quantity_in_stock),
      low_stock_alert: parseInt(formData.low_stock_alert) || 10,
      barcode: formData.barcode || null
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('http://localhost:5000/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to save product');
        return;
      }

      resetForm();
      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Error saving product. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (product) => {
    setFormData({
      product_name: product.product_name,
      category: product.category,
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
      low_stock_alert: product.low_stock_alert,
      barcode: product.barcode || ''
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
          ))}
        </select>
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
        <div className="barcode-input-group">
          <input
            type="text"
            name="barcode"
            placeholder="Barcode"
            value={formData.barcode}
            onChange={handleChange}
          />
          <button type="button" className="generate-btn" onClick={generateBarcode}>
            Generate
          </button>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting
            ? 'Saving...'
            : editingId
            ? '✏️ Update Product'
            : '+ Add Product'}
        </button>
        {editingId && (
          <button type="button" className="cancel-btn" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="🔍 Search by name, category, or barcode..."
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Price (Rs.)</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.product_name}</td>
                <td>{product.category}</td>
                <td>{product.barcode || '-'}</td>
                <td>{Number(product.price).toLocaleString()}</td>
                <td className={product.quantity_in_stock <= product.low_stock_alert ? 'low-stock' : 'in-stock'}>
                  {product.quantity_in_stock}
                </td>
                <td className="action-buttons">
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(product)}
                  >
                    Edit
                  </button>
                  {user.role !== 'staff' && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(product.id, product.product_name)}
                    >
                      Delete
                    </button>
                  )}
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