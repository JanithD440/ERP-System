import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Employees from './pages/Employees';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import POS from './pages/POS';
import Login from './pages/Login';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(savedUser));
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (checkingAuth) {
    return <p className="loading-text">Loading...</p>;
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <span style={{ fontSize: '26px' }}>🏢</span>
              <h2>Mini ERP</h2>
            </div>
            <nav className="sidebar-nav">
            <NavLink to="/pos" className="nav-link">
                🛒 POS
              </NavLink>         
              <NavLink to="/dashboard" className="nav-link">
                📊 Dashboard
              </NavLink>
              <NavLink to="/" end className="nav-link">
                📦 Products
              </NavLink>
              <NavLink to="/categories" className="nav-link">
                🏷️ Categories
              </NavLink>
              <NavLink to="/sales" className="nav-link">
                💰 Sales
              </NavLink>
              <NavLink to="/employees" className="nav-link">
                👥 Employees
              </NavLink>
              <NavLink to="/suppliers" className="nav-link">
              🚚 Suppliers
            </NavLink>
            <NavLink to="/purchase-orders" className="nav-link">
              🛒 Purchase Orders
            </NavLink>
            </nav>

            <div className="user-info">
              Logged in as <strong>{user.name}</strong> ({user.role})
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            <Routes>
            <Route path="/pos" element={<POS />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Products user={user} />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/employees" element={<Employees user={user} />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;