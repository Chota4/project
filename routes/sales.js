const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Get sales list
router.get('/', async (req, res) => {
    try {
        const sales = await db.any(`
            SELECT s.*, p.name as product_name, p.category
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.created_at DESC
        `);
        res.render('sales/index', { 
            title: 'Sales - Addidas Management System',
            sales 
        });
    } catch (error) {
        next(error);
    }
});

// Add sale form
router.get('/new', async (req, res) => {
    try {
        const products = await db.any(`
            SELECT p.id, p.name, p.price, i.quantity as stock
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE i.quantity > 0
            ORDER BY p.name
        `);
        res.render('sales/form', { 
            title: 'Record Sale - Addidas Management System',
            products,
            sale: {}
        });
    } catch (error) {
        next(error);
    }
});

// Create sale
router.post('/', async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        
        // Get product price and current stock
        const product = await db.one(`
            SELECT p.price, i.quantity as stock
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.id = $1
        `, [product_id]);
        
        // Check if we have enough stock
        if (product.stock < quantity) {
            throw new Error('Not enough stock available');
        }
        
        // Calculate total amount
        const total_amount = product.price * quantity;
        
        await db.tx(async t => {
            // Create sale record
            await t.one(
                'INSERT INTO sales (product_id, quantity, total_amount) VALUES ($1, $2, $3) RETURNING id',
                [product_id, quantity, total_amount]
            );
            
            // Update inventory
            await t.none(
                'UPDATE inventory SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
                [quantity, product_id]
            );
        });
        
        res.redirect('/sales');
    } catch (error) {
        next(error);
    }
});

// View sale details
router.get('/:id', async (req, res) => {
    try {
        const sale = await db.one(`
            SELECT s.*, p.name as product_name, p.category, p.price
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE s.id = $1
        `, [req.params.id]);
        
        res.render('sales/details', { 
            title: 'Sale Details - Addidas Management System',
            sale 
        });
    } catch (error) {
        next(error);
    }
});

// Get all sales
router.get('/', async (req, res) => {
  try {
    const sales = await db.any(`
      SELECT s.*,
        json_agg(
          json_build_object(
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku,
              'category', p.category
            ),
            'quantity', si.quantity,
            'size', si.size,
            'price', si.price
          )
        ) as items
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      GROUP BY s.id
    `);
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await db.one(`
      SELECT s.*,
        json_agg(
          json_build_object(
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku,
              'category', p.category
            ),
            'quantity', si.quantity,
            'size', si.size,
            'price', si.price
          )
        ) as items
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [req.params.id]);
    res.json({ success: true, data: sale });
  } catch (error) {
    if (error.received === 0) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new sale
router.post('/', [
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('customer_name').notEmpty(),
  body('customer_email').isEmail(),
  body('payment_method').isIn(['Credit Card', 'Debit Card', 'PayPal', 'Cash']),
  body('shipping_method').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const sale = await db.tx(async t => {
      // Calculate total amount
      const totalAmount = req.body.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Create sale
      const newSale = await t.one(`
        INSERT INTO sales (
          customer_name, customer_email, customer_phone,
          shipping_street, shipping_city, shipping_state,
          shipping_country, shipping_zip_code,
          total_amount, payment_method, payment_status,
          order_status, shipping_method, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `, [
        req.body.customer_name,
        req.body.customer_email,
        req.body.customer_phone,
        req.body.shipping_street,
        req.body.shipping_city,
        req.body.shipping_state,
        req.body.shipping_country,
        req.body.shipping_zip_code,
        totalAmount,
        req.body.payment_method,
        'Pending',
        'Processing',
        req.body.shipping_method,
        req.body.notes
      ]);

      // Create sale items and update inventory
      for (const item of req.body.items) {
        // Check inventory
        const inventory = await t.oneOrNone(`
          SELECT * FROM inventory
          WHERE product_id = $1 AND quantity >= $2
          LIMIT 1
          FOR UPDATE
        `, [item.product_id, item.quantity]);

        if (!inventory) {
          throw new Error(`Insufficient inventory for product ${item.product_id}`);
        }

        // Update inventory
        await t.none(`
          UPDATE inventory
          SET 
            quantity = quantity - $1,
            status = CASE
              WHEN quantity - $1 = 0 THEN 'Out of Stock'
              WHEN quantity - $1 <= minimum_stock THEN 'Low Stock'
              ELSE 'In Stock'
            END
          WHERE id = $2
        `, [item.quantity, inventory.id]);

        // Create sale item
        await t.none(`
          INSERT INTO sale_items (
            sale_id, product_id, quantity, size, price
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          newSale.id,
          item.product_id,
          item.quantity,
          item.size,
          item.price
        ]);
      }

      return newSale;
    });

    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update sale status
router.put('/:id/status', [
  body('order_status').isIn(['Processing', 'Shipped', 'Delivered', 'Cancelled']),
  body('payment_status').isIn(['Pending', 'Completed', 'Failed', 'Refunded'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const sale = await db.tx(async t => {
      const updatedSale = await t.one(`
        UPDATE sales
        SET 
          order_status = $1,
          payment_status = $2,
          tracking_number = $3
        WHERE id = $4
        RETURNING *
      `, [
        req.body.order_status,
        req.body.payment_status,
        req.body.tracking_number,
        req.params.id
      ]);

      // If order is cancelled and was not previously cancelled, restore inventory
      if (req.body.order_status === 'Cancelled' && updatedSale.order_status !== 'Cancelled') {
        const saleItems = await t.any(`
          SELECT * FROM sale_items
          WHERE sale_id = $1
        `, [req.params.id]);

        for (const item of saleItems) {
          await t.none(`
            UPDATE inventory
            SET 
              quantity = quantity + $1,
              status = CASE
                WHEN quantity + $1 = 0 THEN 'Out of Stock'
                WHEN quantity + $1 <= minimum_stock THEN 'Low Stock'
                ELSE 'In Stock'
              END
            WHERE product_id = $2
          `, [item.quantity, item.product_id]);
        }
      }

      return updatedSale;
    });

    res.json({ success: true, data: sale });
  } catch (error) {
    if (error.received === 0) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sales statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await db.task(async t => {
      // Get daily sales
      const dailySales = await t.oneOrNone(`
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM sales
        WHERE 
          DATE(created_at) = CURRENT_DATE
          AND payment_status = 'Completed'
      `);

      // Get top products
      const topProducts = await t.any(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.category,
          SUM(si.quantity) as total_quantity,
          SUM(si.quantity * si.price) as total_revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.payment_status = 'Completed'
        GROUP BY p.id, p.name, p.sku, p.category
        ORDER BY total_quantity DESC
        LIMIT 5
      `);

      return {
        daily: dailySales || { total_sales: 0, total_revenue: 0 },
        topProducts
      };
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 