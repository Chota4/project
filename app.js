const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const pagesRoutes = require('./routes/pages');
const apiRoutes = require('./routes/api');

// Load environment variables
dotenv.config();

// Initialize database
require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (for css, js, uploads, etc)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key_here',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user info available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use('/', authRoutes); // This includes the dashboard route
app.use('/products', productRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/sales', salesRoutes);
app.use('/', pagesRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.accepts('html')) {
    res.status(err.status || 500).render('error/500', {
      title: 'Error - Addidas Management System',
      error: err.message || 'Internal Server Error'
    });
  } else {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).render('error/404', {
      title: '404 Not Found - Addidas Management System'
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Addidas Management System running at http://localhost:${PORT}`);
});
