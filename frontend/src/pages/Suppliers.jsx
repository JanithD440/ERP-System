import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import SearchBar from './components/SearchBar';

function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = () => {
    fetch(`${API_URL}/api/suppliers`)
      .then((res) => res.json())
      .then((data) => {
        setSuppliers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching suppliers:', err);
        setLoading(false);
      });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('${API_URL}/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to add supplier');

      setFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
      });

      fetchSuppliers();

    } catch (err) {
      console.error(err);
      alert('Error adding supplier. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/suppliers/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete supplier');

      fetchSuppliers();

    } catch (err) {
      console.error(err);
      alert('Error deleting supplier. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading suppliers...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>🚚</span>
        <h1>Suppliers</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="supplier_name"
          placeholder="Supplier Name"
          value={formData.supplier_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="contact_person"
          placeholder="Contact Person"
          value={formData.contact_person}
          onChange={handleChange}
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          value={formData.phone}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />
        <input
          type="text"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add Supplier'}
        </button>
      </form>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="🔍 Search by supplier or contact person..."
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.supplier_name}</td>
                <td>{s.contact_person}</td>
                <td>{s.phone}</td>
                <td>{s.email}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(s.id, s.supplier_name)}
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

export default Suppliers;