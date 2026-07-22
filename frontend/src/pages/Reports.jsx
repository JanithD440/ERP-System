import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

function Reports() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = (selectedPeriod) => {
    setLoading(true);
    fetch(`http://localhost:5000/api/reports?period=${selectedPeriod}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching report:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport(period);
  }, [period]);

  const periodLabels = {
    day: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last 365 Days'
  };

const downloadReportPDF = () => {
    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Mini ERP - Business Report', 105, y, { align: 'center' });
    y += 8;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Period: ${periodLabels[period]}`, 105, y, { align: 'center' });
    y += 6;
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, y, { align: 'center' });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    // Summary Section
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const summaryRows = [
      ['Total Revenue', `Rs. ${Number(data.totalRevenue).toLocaleString()}`],
      ['Total Transactions', `${data.totalTransactions}`],
      ['Total Items Sold', `${data.totalItemsSold}`],
      ['Total Salary Expense', `Rs. ${Number(data.totalSalaryExpense).toLocaleString()}`],
      ['Net Profit', `Rs. ${Number(data.netProfit).toLocaleString()}`]
    ];

    summaryRows.forEach(([label, value]) => {
      doc.text(label, 15, y);
      doc.text(value, 120, y);
      y += 6;
    });

    y += 6;
    doc.line(15, y, 195, y);
    y += 10;

    // Top Products Section
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Best Selling Products', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Product', 15, y);
    doc.text('Units Sold', 110, y);
    doc.text('Revenue (Rs.)', 150, y);
    y += 6;
    doc.setFont(undefined, 'normal');

    data.topProducts.forEach((p) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(p.product_name, 15, y);
      doc.text(String(p.total_sold), 110, y);
      doc.text(Number(p.total_revenue).toLocaleString(), 150, y);
      y += 6;
    });

    y += 6;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.line(15, y, 195, y);
    y += 10;

    // Salary Payments Section
    if (data.salaryBreakdown.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Salary Payments', 15, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Employee', 15, y);
      doc.text('Month/Year', 90, y);
      doc.text('Net Salary (Rs.)', 150, y);
      y += 6;
      doc.setFont(undefined, 'normal');

      data.salaryBreakdown.forEach((s) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(s.name, 15, y);
        doc.text(`${s.month} ${s.year}`, 90, y);
        doc.text(Number(s.net_salary).toLocaleString(), 150, y);
        y += 6;
      });
    }

    doc.save(`Report-${period}-${Date.now()}.pdf`);
  };


  if (loading || !data) {
    return <p className="loading-text">Loading report...</p>;
  }

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>📈</span>
        <h1>Reports</h1>
      </div>

      {/* Period Toggle */}
      <div className="report-toggle">
        {['day', 'week', 'month', 'year'].map((p) => (
          <button
            key={p}
            className={`report-toggle-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="report-header-row">
        <p className="report-period-label">Showing data for: {periodLabels[period]}</p>
        <button className="download-report-btn" onClick={downloadReportPDF}>
          📄 Download Report PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">Rs. {Number(data.totalRevenue).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🧾</span>
          <div>
            <p className="stat-label">Transactions</p>
            <h3 className="stat-value">{data.totalTransactions}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div>
            <p className="stat-label">Items Sold</p>
            <h3 className="stat-value">{data.totalItemsSold}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <div>
            <p className="stat-label">Salary Expense</p>
            <h3 className="stat-value">Rs. {Number(data.totalSalaryExpense).toLocaleString()}</h3>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">{data.netProfit >= 0 ? '📈' : '📉'}</span>
          <div>
            <p className="stat-label">Net Profit</p>
            <h3 className="stat-value" style={{ color: data.netProfit >= 0 ? '#55efc4' : '#ff6b6b' }}>
              Rs. {Number(data.netProfit).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>


      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="section-title">📈 Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.salesByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a52" />
              <XAxis dataKey="date" stroke="#a0a0b8" fontSize={12} />
              <YAxis stroke="#a0a0b8" fontSize={12} />
              <Tooltip contentStyle={{ background: '#262638', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="total" stroke="#6c5ce7" strokeWidth={3} dot={{ fill: '#a29bfe' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="section-title">🏆 Top Products</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#3a3a52" />
              <XAxis type="number" stroke="#a0a0b8" fontSize={12} />
              <YAxis dataKey="product_name" type="category" stroke="#a0a0b8" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: '#262638', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="total_sold" fill="#00cec9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="dashboard-section">
        <h3 className="section-title">🏆 Best Selling Products</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.product_name}</td>
                  <td>{p.total_sold}</td>
                  <td>{Number(p.total_revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Transactions */}
      <div className="dashboard-section">
        <h3 className="section-title">🧾 All Transactions</h3>
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
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.product_name}</td>
                  <td>{t.customer_name}</td>
                  <td>{t.quantity_sold}</td>
                  <td>{Number(t.total_price).toLocaleString()}</td>
                  <td>{new Date(t.sale_date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Breakdown */}
      {data.salaryBreakdown.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">💼 Salary Payments</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Month/Year</th>
                  <th>Net Salary (Rs.)</th>
                  <th>Paid On</th>
                </tr>
              </thead>
              <tbody>
                {data.salaryBreakdown.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.month} {s.year}</td>
                    <td>{Number(s.net_salary).toLocaleString()}</td>
                    <td>{new Date(s.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}

export default Reports;