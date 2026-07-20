import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';

function Sales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    product_id: '',
    customer_name: '',
    quantity_sold: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSales = () => {
    fetch('http://localhost:5000/api/sales')
      .then((res) => res.json())
      .then((data) => {
        setSales(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching sales:', err);
        setLoading(false);
      });
  };

  const filteredSales = sales.filter((sale) =>
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchProducts = () => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error fetching products:', err));
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(formData.product_id),
          customer_name: formData.customer_name,
          quantity_sold: parseInt(formData.quantity_sold)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to add sale');
        return;
      }

      setFormData({
        product_id: '',
        customer_name: '',
        quantity_sold: ''
      });

      fetchSales();
      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Error adding sale. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="loading-text">Loading sales...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>💰</span>
        <h1>Sales</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <select
          name="product_id"
          value={formData.product_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.product_name} (Stock: {p.quantity_in_stock})
            </option>
          ))}
        </select>
        <input
          type="text"
          name="customer_name"
          placeholder="Customer Name"
          value={formData.customer_name}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="quantity_sold"
          placeholder="Quantity"
          value={formData.quantity_sold}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add Sale'}
        </button>
      </form>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="🔍 Search by customer or product..."
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Customer</th>
              <th>Qty Sold</th>
              <th>Total (Rs.)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.id}</td>
                <td>{sale.product_name}</td>
                <td>{sale.category}</td>
                <td>{sale.customer_name}</td>
                <td>{sale.quantity_sold}</td>
                <td>{Number(sale.total_price).toLocaleString()}</td>
                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Sales;