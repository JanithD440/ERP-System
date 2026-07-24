import { useState, useEffect } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function Payroll() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    days_present: '',
    days_absent: '',
    deductions: '',
    bonus: ''
  });

  const fetchPayroll = () => {
    fetch('http://localhost:5000/api/payroll')
      .then((res) => res.json())
      .then((data) => {
        setPayrollRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchEmployees = () => {
    fetch('http://localhost:5000/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchPayroll();
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: parseInt(formData.employee_id),
          month: formData.month,
          year: parseInt(formData.year),
          days_present: parseInt(formData.days_present) || 0,
          days_absent: parseInt(formData.days_absent) || 0,
          deductions: parseFloat(formData.deductions) || 0,
          bonus: parseFloat(formData.bonus) || 0
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to process salary');
        return;
      }

      setFormData({
        employee_id: '',
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear(),
        days_present: '',
        days_absent: '',
        deductions: '',
        bonus: ''
      });

      fetchPayroll();

    } catch (err) {
      console.error(err);
      alert('Error processing salary. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this payroll record for ${name}?`);
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/payroll/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete record');
        return;
      }

      fetchPayroll();

    } catch (err) {
      console.error(err);
      alert('Error deleting record. Check console for details.');
    }
  };

  if (loading) {
    return <p className="loading-text">Loading payroll...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>💼</span>
        <h1>Payroll</h1>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        <select
          name="employee_id"
          value={formData.employee_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Employee</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} (Rs. {Number(emp.salary).toLocaleString()})
            </option>
          ))}
        </select>
        <select name="month" value={formData.month} onChange={handleChange} required>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          name="year"
          placeholder="Year"
          value={formData.year}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="days_present"
          placeholder="Days Present"
          value={formData.days_present}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="days_absent"
          placeholder="Days Absent"
          value={formData.days_absent}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="deductions"
          placeholder="Deductions (Rs.)"
          value={formData.deductions}
          onChange={handleChange}
        />
        <input
          type="number"
          name="bonus"
          placeholder="Bonus (Rs.)"
          value={formData.bonus}
          onChange={handleChange}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Processing...' : '💰 Process Salary'}
        </button>
      </form>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Month/Year</th>
              <th>Basic Salary</th>
              <th>Present/Absent</th>
              <th>Deductions</th>
              <th>Bonus</th>
              <th>Net Salary</th>
              <th>Paid On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.name}</td>
                <td>{record.month} {record.year}</td>
                <td>{Number(record.basic_salary).toLocaleString()}</td>
                <td>{record.days_present} / {record.days_absent}</td>
                <td className="low-stock">{Number(record.deductions).toLocaleString()}</td>
                <td className="in-stock">{Number(record.bonus).toLocaleString()}</td>
                <td><strong>Rs. {Number(record.net_salary).toLocaleString()}</strong></td>
                <td>{new Date(record.payment_date).toLocaleDateString()}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(record.id, record.name)}
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

export default Payroll;