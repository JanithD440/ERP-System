import { useState, useEffect } from 'react';

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: '',
    attendance_status: 'present'
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          position: formData.position,
          salary: parseFloat(formData.salary),
          attendance_status: formData.attendance_status
        })
      });

      if (!res.ok) throw new Error('Failed to add employee');

      setFormData({
        name: '',
        position: '',
        salary: '',
        attendance_status: 'present'
      });

      fetchEmployees();

    } catch (err) {
      console.error(err);
      alert('Error adding employee. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`"${name}" delete karanna sure da?`);
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
          {submitting ? 'Adding...' : '+ Add Employee'}
        </button>
      </form>

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
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.name}</td>
                <td>{emp.position}</td>
                <td>{Number(emp.salary).toLocaleString()}</td>
                <td className={emp.attendance_status === 'present' ? 'in-stock' : 'low-stock'}>
                  {emp.attendance_status}
                </td>
                <td>{new Date(emp.date_joined).toLocaleDateString()}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(emp.id, emp.name)}
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

export default Employees;