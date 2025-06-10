const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuth } = require('../middleware/authMiddleware');

// Products
router.post('/products', ensureAuth, dashboardController.createProduct);
router.put('/products/:id', ensureAuth, dashboardController.updateProduct);
router.delete('/products/:id', ensureAuth, dashboardController.deleteProduct);

// Sales
router.post('/sales', ensureAuth, dashboardController.createSale);

// Inventory
router.put('/inventory', ensureAuth, dashboardController.updateStock);

module.exports = router; 