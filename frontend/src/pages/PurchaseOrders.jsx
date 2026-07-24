import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import SearchBar from './components/SearchBar';

function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    supplier_id: '',
    product_id: '',
    quantity_ordered: '',
    unit_cost: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = () => {
    fetch(`${API_URL}/api/purchase-orders`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching orders:', err);
        setLoading(false);
      });
  };
  const filteredOrders = orders.filter((o) =>
    o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchSuppliers = () => {
    fetch(`${API_URL}/api/suppliers`)
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));
  };

  const fetchProducts = () => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('${API_URL}/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: parseInt(formData.supplier_id),
          product_id: parseInt(formData.product_id),
          quantity_ordered: parseInt(formData.quantity_ordered),
          unit_cost: parseFloat(formData.unit_cost)
        })
      });

      if (!res.ok) throw new Error('Failed to create purchase order');

      setFormData({
        supplier_id: '',
        product_id: '',
        quantity_ordered: '',
        unit_cost: ''
      });

      fetchOrders();

    } catch (err) {
      console.error(err);
      alert('Error creating purchase order. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async (id) => {
    const confirm = window.confirm('Mark this order as received? This will update the product stock.');
    if (!confirm) return;

    try {
      const res = await fetch(`${API_URL}/api/purchase-orders/${id}/receive`, {
        method: 'PUT'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to mark as received');
        return;
      }

      fetchOrders();
      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Error updating order. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading purchase orders...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>🛒</span>
        <h1>Purchase Orders</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <select
          name="supplier_id"
          value={formData.supplier_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>
        <select
          name="product_id"
          value={formData.product_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.product_name}</option>
          ))}
        </select>
        <input
          type="number"
          name="quantity_ordered"
          placeholder="Quantity"
          value={formData.quantity_ordered}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="unit_cost"
          placeholder="Unit Cost (Rs.)"
          value={formData.unit_cost}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : '+ Create Order'}
        </button>
      </form>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="🔍 Search by supplier or product..."
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.supplier_name}</td>
                <td>{order.product_name}</td>
                <td>{order.quantity_ordered}</td>
                <td>{Number(order.unit_cost).toLocaleString()}</td>
                <td>{Number(order.total_cost).toLocaleString()}</td>
                <td className={order.status === 'received' ? 'in-stock' : 'low-stock'}>
                  {order.status}
                </td>
                <td>{new Date(order.order_date).toLocaleDateString()}</td>
                <td>
                  {order.status === 'pending' && (
                    <button
                      className="edit-btn"
                      onClick={() => handleReceive(order.id)}
                    >
                      Mark Received
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

export default PurchaseOrders;