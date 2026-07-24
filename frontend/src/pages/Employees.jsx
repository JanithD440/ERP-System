import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';

function Employees({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: '',
    attendance_status: 'present'
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchEmployees = () => {
    fetch('http://localhost:5000/api/employees')
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching employees:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      salary: '',
      attendance_status: 'present'
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: formData.name,
      position: formData.position,
      salary: parseFloat(formData.salary),
      attendance_status: formData.attendance_status
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/api/employees/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('http://localhost:5000/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error('Failed to save employee');

      resetForm();
      fetchEmployees();

    } catch (err) {
      console.error(err);
      alert('Error saving employee. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (emp) => {
    setFormData({
      name: emp.name,
      position: emp.position,
      salary: emp.salary,
      attendance_status: emp.attendance_status
    });
    setEditingId(emp.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/employees/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete employee');

      fetchEmployees();

    } catch (err) {
      console.error(err);
      alert('Error deleting employee. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading employees...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>👥</span>
        <h1>Employees</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Employee Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="position"
          placeholder="Position"
          value={formData.position}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="salary"
          placeholder="Salary"
          value={formData.salary}
          onChange={handleChange}
          required
        />
        <select
          name="attendance_status"
          value={formData.attendance_status}
          onChange={handleChange}
        >
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="on-leave">On Leave</option>
        </select>
        <button type="submit" disabled={submitting}>
          {submitting
            ? 'Saving...'
            : editingId
            ? '✏️ Update Employee'
            : '+ Add Employee'}
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
        placeholder="🔍 Search by name or position..."
      />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Position</th>
              <th>Salary (Rs.)</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.name}</td>
                <td>{emp.position}</td>
                <td>{Number(emp.salary).toLocaleString()}</td>
                <td className={emp.attendance_status === 'present' ? 'in-stock' : 'low-stock'}>
                  {emp.attendance_status}
                </td>
                <td>{new Date(emp.date_joined).toLocaleDateString()}</td>

                <td className="action-buttons">
                  <button
                    className="edit-btn"
                    onClick={() => handleEditClick(emp)}
                  >
                    Edit
                  </button>
                  {user.role === 'admin' && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(emp.id, emp.name)}
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

export default Employees;