import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6c5ce7', '#a29bfe', '#00cec9', '#55efc4', '#fdcb6e', '#ff7675'];

function Dashboard() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/dashboard').then((res) => res.json()),
      fetch('http://localhost:5000/api/analytics').then((res) => res.json())
    ])
      .then(([dashboardData, analyticsData]) => {
        setData(dashboardData);
        setAnalytics(analyticsData);
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

        <div className="stat-card">
          <span className="stat-icon">🚚</span>
          <div>
            <p className="stat-label">Suppliers</p>
            <h3 className="stat-value">{data.totalSuppliers}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🛒</span>
          <div>
            <p className="stat-label">Pending Orders</p>
            <h3 className="stat-value">{data.pendingOrders}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📥</span>
          <div>
            <p className="stat-label">Purchase Cost</p>
            <h3 className="stat-value">Rs. {Number(data.totalPurchaseCost).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Sales Trend Line Chart */}
        <div className="chart-card">
          <h3 className="section-title">📈 Sales Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a52" />
              <XAxis dataKey="date" stroke="#a0a0b8" fontSize={12} />
              <YAxis stroke="#a0a0b8" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#262638', border: 'none', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="total" stroke="#6c5ce7" strokeWidth={3} dot={{ fill: '#a29bfe' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Products by Category Bar Chart */}
        <div className="chart-card">
          <h3 className="section-title">📦 Products by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a52" />
              <XAxis dataKey="category" stroke="#a0a0b8" fontSize={12} />
              <YAxis stroke="#a0a0b8" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#262638', border: 'none', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#00cec9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Value by Category Pie Chart */}
        <div className="chart-card">
          <h3 className="section-title">🥧 Stock Value by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.stockByCategory}
                dataKey="value"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => entry.category}
              >
                {analytics.stockByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#262638', border: 'none', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
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