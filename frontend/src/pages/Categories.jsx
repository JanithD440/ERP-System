import { useState, useEffect } from 'react';
import { API_URL } from '../config';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    fetch(`${API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching categories:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('${API_URL}/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_name: categoryName })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to add category');
        return;
      }

      setCategoryName('');
      fetchCategories();

    } catch (err) {
      console.error(err);
      alert('Error adding category. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete category');
        return;
      }

      fetchCategories();

    } catch (err) {
      console.error(err);
      alert('Error deleting category. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading categories...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>🏷️</span>
        <h1>Categories</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="New Category Name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : '+ Add Category'}
        </button>
      </form>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Category Name</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.id}</td>
                <td>{cat.category_name}</td>
                <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(cat.id, cat.category_name)}
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

export default Categories;