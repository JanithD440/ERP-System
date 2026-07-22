require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test Route
app.get('/', (req, res) => {
  res.send('Mini ERP Backend is running! 🚀');
});

// Test Database Connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Database connected successfully!', 
      time: result.rows[0].now 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});



// ==================== CATEGORIES API ====================

// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY category_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add new category
app.post('/api/categories', async (req, res) => {
  try {
    const { category_name } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (category_name) VALUES ($1) RETURNING *`,
      [category_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove category
app.delete('/api/categories/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET product by barcode (for POS scanning later)
app.get('/api/products/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found for this barcode' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});




// ==================== PRODUCTS API ====================

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add new product
app.post('/api/products', async (req, res) => {
  try {
    const { product_name, category, price, quantity_in_stock, low_stock_alert, barcode } = req.body;
    const result = await pool.query(
      `INSERT INTO products (product_name, category, price, quantity_in_stock, low_stock_alert, barcode) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [product_name, category, price, quantity_in_stock, low_stock_alert || 10, barcode || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This barcode is already used by another product' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, price, quantity_in_stock, low_stock_alert, barcode } = req.body;
    const result = await pool.query(
      `UPDATE products 
       SET product_name = $1, category = $2, price = $3, quantity_in_stock = $4, low_stock_alert = $5, barcode = $6
       WHERE id = $7 RETURNING *`,
      [product_name, category, price, quantity_in_stock, low_stock_alert, barcode || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This barcode is already used by another product' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove product

app.delete('/api/products/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== SALES API ====================

// GET all sales (with product details)
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sales.id, sales.customer_name, sales.quantity_sold, 
             sales.total_price, sales.sale_date,
             products.product_name, products.category
      FROM sales
      JOIN products ON sales.product_id = products.id
      ORDER BY sales.sale_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Create new sale (and reduce stock)
app.post('/api/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, customer_name, quantity_sold } = req.body;

    await client.query('BEGIN');

    // Get product price and check stock
    const productResult = await client.query(
      'SELECT price, quantity_in_stock FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const { price, quantity_in_stock } = productResult.rows[0];

    if (quantity_in_stock < quantity_sold) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    const total_price = price * quantity_sold;

    // Insert sale record
    const saleResult = await client.query(
      `INSERT INTO sales (product_id, customer_name, quantity_sold, total_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [product_id, customer_name, quantity_sold, total_price]
    );

    // Reduce stock
    await client.query(
      'UPDATE products SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2',
      [quantity_sold, product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(saleResult.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE - Remove sale record
app.delete('/api/sales/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM sales WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== POS CHECKOUT API ====================

// POST - Process a multi-item sale (cart checkout)
app.post('/api/pos/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_name, items } = req.body;
    // items = [{ product_id, quantity }, ...]

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    await client.query('BEGIN');

    const receiptItems = [];
    let grandTotal = 0;

    for (const item of items) {
      const { product_id, quantity } = item;

      // Get product details and lock the row
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Product ID ${product_id} not found` });
      }

      const product = productResult.rows[0];

      if (product.quantity_in_stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Not enough stock for "${product.product_name}". Available: ${product.quantity_in_stock}`
        });
      }

      const itemTotal = product.price * quantity;
      grandTotal += parseFloat(itemTotal);

      // Insert sale record
      const saleResult = await client.query(
        `INSERT INTO sales (product_id, customer_name, quantity_sold, total_price)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [product_id, customer_name || 'Walk-in Customer', quantity, itemTotal]
      );

      // Reduce stock
      await client.query(
        'UPDATE products SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2',
        [quantity, product_id]
      );

      receiptItems.push({
        product_name: product.product_name,
        quantity: quantity,
        unit_price: product.price,
        total: itemTotal,
        sale_id: saleResult.rows[0].id
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Checkout successful',
      customer_name: customer_name || 'Walk-in Customer',
      items: receiptItems,
      grand_total: grandTotal,
      date: new Date()
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});



// ==================== EMPLOYEES API ====================

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, position, salary, attendance_status } = req.body;
    const result = await pool.query(
      `INSERT INTO employees (name, position, salary, attendance_status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, position, salary, attendance_status || 'present']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, salary, attendance_status } = req.body;
    const result = await pool.query(
      `UPDATE employees 
       SET name = $1, position = $2, salary = $3, attendance_status = $4
       WHERE id = $5 RETURNING *`,
      [name, position, salary, attendance_status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove employee
app.delete('/api/employees/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PAYROLL API ====================

// GET all payroll records (with employee details)
app.get('/api/payroll', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT payroll.*, employees.name, employees.position
      FROM payroll
      JOIN employees ON payroll.employee_id = employees.id
      ORDER BY payroll.payment_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET payroll history for a specific employee
app.get('/api/payroll/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(`
      SELECT payroll.*, employees.name, employees.position
      FROM payroll
      JOIN employees ON payroll.employee_id = employees.id
      WHERE payroll.employee_id = $1
      ORDER BY payroll.payment_date DESC
    `, [employeeId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Process salary payment
app.post('/api/payroll', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { employee_id, month, year, days_present, days_absent, deductions, bonus } = req.body;

    // Check if already paid for this month/year
    const existing = await pool.query(
      'SELECT * FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
      [employee_id, month, year]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Salary already processed for this employee for this month' });
    }

    // Get employee's basic salary
    const empResult = await pool.query('SELECT salary FROM employees WHERE id = $1', [employee_id]);
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const basic_salary = parseFloat(empResult.rows[0].salary);
    const totalDays = parseInt(days_present) + parseInt(days_absent);
    const perDaySalary = totalDays > 0 ? basic_salary / totalDays : basic_salary;
    const attendanceAdjustedSalary = perDaySalary * parseInt(days_present);

    const deductionAmount = parseFloat(deductions) || 0;
    const bonusAmount = parseFloat(bonus) || 0;
    const net_salary = attendanceAdjustedSalary - deductionAmount + bonusAmount;

    const result = await pool.query(
      `INSERT INTO payroll (employee_id, month, year, basic_salary, days_present, days_absent, deductions, bonus, net_salary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [employee_id, month, year, basic_salary, days_present, days_absent, deductionAmount, bonusAmount, net_salary]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove payroll record (admin only, for corrections)
app.delete('/api/payroll/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM payroll WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// ==================== AUTHENTICATION API ====================

// REGISTER - Create new user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, role || 'staff']
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// LOGIN - Authenticate user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== AUTH MIDDLEWARE ====================

// Verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please login.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token. Please login again.' });
    }
    req.user = decoded; // { id, email, role }
    next();
  });
}

// Check if user has required role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}



//================API Dashboard===================//

app.get('/api/dashboard', async (req, res) => {
  try {
    const productsCount = await pool.query('SELECT COUNT(*) FROM products');
    
    const stockValue = await pool.query(
      'SELECT SUM(price * quantity_in_stock) as total FROM products'
    );

    const salesRevenue = await pool.query(
      'SELECT SUM(total_price) as total FROM sales'
    );

    const employeesCount = await pool.query('SELECT COUNT(*) FROM employees');

    // NEW: Suppliers count
    const suppliersCount = await pool.query('SELECT COUNT(*) FROM suppliers');

    // NEW: Pending purchase orders count
    const pendingOrders = await pool.query(
      "SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending'"
    );

    // NEW: Total purchase cost (all orders)
    const purchaseCost = await pool.query(
      'SELECT SUM(total_cost) as total FROM purchase_orders'
    );

    const lowStock = await pool.query(
      'SELECT id, product_name, quantity_in_stock, low_stock_alert FROM products WHERE quantity_in_stock <= low_stock_alert'
    );

    const recentSales = await pool.query(`
      SELECT sales.id, sales.customer_name, sales.quantity_sold, 
             sales.total_price, sales.sale_date, products.product_name
      FROM sales
      JOIN products ON sales.product_id = products.id
      ORDER BY sales.sale_date DESC
      LIMIT 5
    `);

    res.json({
      totalProducts: parseInt(productsCount.rows[0].count),
      totalStockValue: parseFloat(stockValue.rows[0].total) || 0,
      totalSalesRevenue: parseFloat(salesRevenue.rows[0].total) || 0,
      totalEmployees: parseInt(employeesCount.rows[0].count),
      totalSuppliers: parseInt(suppliersCount.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      totalPurchaseCost: parseFloat(purchaseCost.rows[0].total) || 0,
      lowStockProducts: lowStock.rows,
      recentSales: recentSales.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== ANALYTICS API ====================

app.get('/api/analytics', async (req, res) => {
  try {
    // Products count by category
    const categoryData = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category
    `);

    // Sales by date
    const salesTrend = await pool.query(`
      SELECT DATE(sale_date) as date, SUM(total_price) as total
      FROM sales
      GROUP BY DATE(sale_date)
      ORDER BY date ASC
    `);

    // Stock value by category
    const stockByCategory = await pool.query(`
      SELECT category, SUM(price * quantity_in_stock) as value
      FROM products
      GROUP BY category
    `);

    res.json({
      categoryData: categoryData.rows,
      salesTrend: salesTrend.rows,
      stockByCategory: stockByCategory.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== REPORTS API ====================

app.get('/api/reports', async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year'

    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "sale_date >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "sale_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "sale_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "sale_date >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "sale_date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    let payrollDateFilter;
    switch (period) {
      case 'day':
        payrollDateFilter = "payment_date >= CURRENT_DATE";
        break;
      case 'week':
        payrollDateFilter = "payment_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        payrollDateFilter = "payment_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        payrollDateFilter = "payment_date >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        payrollDateFilter = "payment_date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Total revenue & count for the period
    const summary = await pool.query(`
      SELECT 
        COALESCE(SUM(total_price), 0) as total_revenue,
        COUNT(*) as total_transactions,
        COALESCE(SUM(quantity_sold), 0) as total_items_sold
      FROM sales
      WHERE ${dateFilter}
    `);

    // Sales grouped by date (for chart)
    const salesByDate = await pool.query(`
      SELECT DATE(sale_date) as date, SUM(total_price) as total
      FROM sales
      WHERE ${dateFilter}
      GROUP BY DATE(sale_date)
      ORDER BY date ASC
    `);

    // Best-selling products
    const topProducts = await pool.query(`
      SELECT products.product_name, SUM(sales.quantity_sold) as total_sold, 
             SUM(sales.total_price) as total_revenue
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE ${dateFilter}
      GROUP BY products.product_name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // All transactions in period
    const transactions = await pool.query(`
      SELECT sales.id, sales.customer_name, sales.quantity_sold, 
             sales.total_price, sales.sale_date, products.product_name
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE ${dateFilter}
      ORDER BY sales.sale_date DESC
    `);

    // Salary expense for the period
    const salaryExpense = await pool.query(`
      SELECT COALESCE(SUM(net_salary), 0) as total, COUNT(*) as count
      FROM payroll
      WHERE ${payrollDateFilter}
    `);

    const salaryBreakdown = await pool.query(`
      SELECT payroll.id, employees.name, payroll.month, payroll.year, 
             payroll.net_salary, payroll.payment_date
      FROM payroll
      JOIN employees ON payroll.employee_id = employees.id
      WHERE ${payrollDateFilter}
      ORDER BY payroll.payment_date DESC
    `);

    const totalRevenue = parseFloat(summary.rows[0].total_revenue);
    const totalSalaryExpense = parseFloat(salaryExpense.rows[0].total);

    res.json({
      period,
      totalRevenue,
      totalTransactions: parseInt(summary.rows[0].total_transactions),
      totalItemsSold: parseInt(summary.rows[0].total_items_sold),
      totalSalaryExpense,
      netProfit: totalRevenue - totalSalaryExpense,
      salesByDate: salesByDate.rows,
      topProducts: topProducts.rows,
      transactions: transactions.rows,
      salaryBreakdown: salaryBreakdown.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});





// ==================== SUPPLIERS API ====================

// GET all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Add new supplier
app.post('/api/suppliers', async (req, res) => {
  try {
    const { supplier_name, contact_person, phone, email, address } = req.body;
    const result = await pool.query(
      `INSERT INTO suppliers (supplier_name, contact_person, phone, email, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplier_name, contact_person, phone, email, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove supplier
app.delete('/api/suppliers/:id', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PURCHASE ORDERS API ====================

// GET all purchase orders (with supplier + product details)
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT po.id, po.quantity_ordered, po.unit_cost, po.total_cost, 
             po.status, po.order_date, po.received_date,
             suppliers.supplier_name,
             products.product_name
      FROM purchase_orders po
      JOIN suppliers ON po.supplier_id = suppliers.id
      JOIN products ON po.product_id = products.id
      ORDER BY po.order_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Create new purchase order
app.post('/api/purchase-orders', async (req, res) => {
  try {
    const { supplier_id, product_id, quantity_ordered, unit_cost } = req.body;
    const total_cost = quantity_ordered * unit_cost;

    const result = await pool.query(
      `INSERT INTO purchase_orders (supplier_id, product_id, quantity_ordered, unit_cost, total_cost)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplier_id, product_id, quantity_ordered, unit_cost, total_cost]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mark purchase order as "received" (this increases product stock)
app.put('/api/purchase-orders/:id/receive', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get the purchase order
    const poResult = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (poResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const po = poResult.rows[0];

    if (po.status === 'received') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This order is already marked as received' });
    }

    // Update purchase order status
    await client.query(
      `UPDATE purchase_orders SET status = 'received', received_date = NOW() WHERE id = $1`,
      [id]
    );

    // Increase product stock
    await client.query(
      `UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2`,
      [po.quantity_ordered, po.product_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Purchase order marked as received. Stock updated.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});