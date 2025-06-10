const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Get inventory list
router.get('/', async (req, res) => {
    try {
        const inventory = await db.any(`
            SELECT i.*, p.name as product_name, p.category
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            ORDER BY i.updated_at DESC
        `);
        res.render('inventory/index', { 
            title: 'Inventory - Addidas Management System',
            inventory 
        });
    } catch (error) {
        next(error);
    }
});

// Add inventory form
router.get('/add', async (req, res) => {
    try {
        const products = await db.any('SELECT id, name FROM products ORDER BY name');
        res.render('inventory/form', { 
            title: 'Add Inventory - Addidas Management System',
            products,
            inventory: {}
        });
    } catch (error) {
        next(error);
    }
});

// Create/Update inventory
router.post('/', async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        
        // Check if inventory exists for this product
        const existing = await db.oneOrNone('SELECT * FROM inventory WHERE product_id = $1', [product_id]);
        
        if (existing) {
            // Update existing inventory
            await db.none(
                'UPDATE inventory SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
                [quantity, product_id]
            );
        } else {
            // Create new inventory entry
            await db.none(
                'INSERT INTO inventory (product_id, quantity) VALUES ($1, $2)',
                [product_id, quantity]
            );
        }
        
        res.redirect('/inventory');
    } catch (error) {
        next(error);
    }
});

// Edit inventory form
router.get('/:id/edit', async (req, res) => {
    try {
        const inventory = await db.one(`
            SELECT i.*, p.name as product_name
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.id = $1
        `, [req.params.id]);
        
        const products = await db.any('SELECT id, name FROM products ORDER BY name');
        
        res.render('inventory/form', { 
            title: 'Edit Inventory - Addidas Management System',
            inventory,
            products
        });
    } catch (error) {
        next(error);
    }
});

// Update inventory quantity
router.post('/:id', async (req, res) => {
    try {
        const { quantity } = req.body;
        await db.none(
            'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, req.params.id]
        );
        res.redirect('/inventory');
    } catch (error) {
        next(error);
    }
});

// Get all inventory items
router.get('/all', async (req, res) => {
  try {
    const inventory = await db.any(`
      SELECT i.*, 
        json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku,
          'category', p.category
        ) as product
      FROM inventory i
      JOIN products p ON i.product_id = p.id
    `);
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get inventory by product ID
router.get('/product/:productId', async (req, res) => {
  try {
    const inventory = await db.any(`
      SELECT i.*, 
        json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku,
          'category', p.category
        ) as product
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.product_id = $1
    `, [req.params.productId]);
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const inventory = await db.any(`
      SELECT i.*, 
        json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku,
          'category', p.category
        ) as product
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.status = 'Low Stock'
    `);
    res.json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new inventory entry
router.post('/new', [
  body('product_id').notEmpty(),
  body('warehouse').notEmpty(),
  body('location').notEmpty(),
  body('quantity').isInt({ min: 0 }),
  body('minimum_stock').isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const inventory = await db.one(`
      INSERT INTO inventory (
        product_id, warehouse, location, quantity,
        minimum_stock, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5,
        CASE
          WHEN $4 = 0 THEN 'Out of Stock'
          WHEN $4 <= $5 THEN 'Low Stock'
          ELSE 'In Stock'
        END,
        $6
      ) RETURNING *
    `, [
      req.body.product_id,
      req.body.warehouse,
      req.body.location,
      req.body.quantity,
      req.body.minimum_stock,
      req.body.notes
    ]);

    res.status(201).json({ success: true, data: inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update inventory
router.put('/:id', async (req, res) => {
  try {
    const inventory = await db.one(`
      UPDATE inventory
      SET 
        warehouse = $1,
        location = $2,
        quantity = $3,
        minimum_stock = $4,
        status = CASE
          WHEN $3 = 0 THEN 'Out of Stock'
          WHEN $3 <= $4 THEN 'Low Stock'
          ELSE 'In Stock'
        END,
        notes = $5
      WHERE id = $6
      RETURNING *
    `, [
      req.body.warehouse,
      req.body.location,
      req.body.quantity,
      req.body.minimum_stock,
      req.body.notes,
      req.params.id
    ]);

    res.json({ success: true, data: inventory });
  } catch (error) {
    if (error.received === 0) {
      return res.status(404).json({ success: false, message: 'Inventory not found' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Restock inventory
router.post('/:id/restock', [
  body('quantity').isInt({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const inventory = await db.one(`
      UPDATE inventory
      SET 
        quantity = quantity + $1,
        last_restocked = CURRENT_TIMESTAMP,
        status = CASE
          WHEN quantity + $1 = 0 THEN 'Out of Stock'
          WHEN quantity + $1 <= minimum_stock THEN 'Low Stock'
          ELSE 'In Stock'
        END
      WHERE id = $2
      RETURNING *
    `, [req.body.quantity, req.params.id]);

    res.json({ success: true, data: inventory });
  } catch (error) {
    if (error.received === 0) {
      return res.status(404).json({ success: false, message: 'Inventory not found' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 