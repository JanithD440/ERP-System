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
    const { product_name, category, price, quantity_in_stock, low_stock_alert } = req.body;
    const result = await pool.query(
      `INSERT INTO products (product_name, category, price, quantity_in_stock, low_stock_alert) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product_name, category, price, quantity_in_stock, low_stock_alert || 10]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, category, price, quantity_in_stock, low_stock_alert } = req.body;
    const result = await pool.query(
      `UPDATE products 
       SET product_name = $1, category = $2, price = $3, quantity_in_stock = $4, low_stock_alert = $5
       WHERE id = $6 RETURNING *`,
      [product_name, category, price, quantity_in_stock, low_stock_alert, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove product
app.delete('/api/products/:id', async (req, res) => {
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
app.delete('/api/sales/:id', async (req, res) => {
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
app.delete('/api/employees/:id', async (req, res) => {
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


// ==================== DASHBOARD API ====================

app.get('/api/dashboard', async (req, res) => {
  try {
    // Total products
    const productsCount = await pool.query('SELECT COUNT(*) FROM products');
    
    // Total stock value (price * quantity)
    const stockValue = await pool.query(
      'SELECT SUM(price * quantity_in_stock) as total FROM products'
    );

    // Total sales revenue
    const salesRevenue = await pool.query(
      'SELECT SUM(total_price) as total FROM sales'
    );

    // Total employees
    const employeesCount = await pool.query('SELECT COUNT(*) FROM employees');

    // Low stock products
    const lowStock = await pool.query(
      'SELECT id, product_name, quantity_in_stock, low_stock_alert FROM products WHERE quantity_in_stock <= low_stock_alert'
    );

    // Recent 5 sales
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
      lowStockProducts: lowStock.rows,
      recentSales: recentSales.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});