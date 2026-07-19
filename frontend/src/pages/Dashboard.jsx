import { useState, useEffect } from 'react';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="loading-text">Loading dashboard...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>📊</span>
        <h1>Dashboard</h1>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div>
            <p className="stat-label">Total Products</p>
            <h3 className="stat-value">{data.totalProducts}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💵</span>
          <div>
            <p className="stat-label">Stock Value</p>
            <h3 className="stat-value">Rs. {Number(data.totalStockValue).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <p className="stat-label">Sales Revenue</p>
            <h3 className="stat-value">Rs. {Number(data.totalSalesRevenue).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-label">Employees</p>
            <h3 className="stat-value">{data.totalEmployees}</h3>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {data.lowStockProducts.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">⚠️ Low Stock Alerts</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Alert Threshold</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockProducts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.product_name}</td>
                    <td className="low-stock">{p.quantity_in_stock}</td>
                    <td>{p.low_stock_alert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div className="dashboard-section">
        <h3 className="section-title">🕒 Recent Sales</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Total (Rs.)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.product_name}</td>
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
    </div>
  );
}

export default Dashboard;