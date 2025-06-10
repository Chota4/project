const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, validationResult } = require('express-validator');

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await db.any('SELECT * FROM products ORDER BY created_at DESC');
        res.render('products/index', { 
            title: 'Products - Addidas Management System',
            products 
        });
    } catch (error) {
        next(error);
    }
});

// Add new product form
router.get('/new', (req, res) => {
    res.render('products/form', { 
        title: 'Add Product - Addidas Management System',
        product: {}
    });
});

// Create new product
router.post('/', async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        await db.one(
            'INSERT INTO products (name, description, price, category) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, description, price, category]
        );
        res.redirect('/products');
    } catch (error) {
        next(error);
    }
});

// Edit product form
router.get('/:id/edit', async (req, res) => {
    try {
        const product = await db.one('SELECT * FROM products WHERE id = $1', [req.params.id]);
        res.render('products/form', { 
            title: 'Edit Product - Addidas Management System',
            product 
        });
    } catch (error) {
        next(error);
    }
});

// Update product
router.post('/:id', async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        await db.none(
            'UPDATE products SET name = $1, description = $2, price = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
            [name, description, price, category, req.params.id]
        );
        res.redirect('/products');
    } catch (error) {
        next(error);
    }
});

// Delete product
router.post('/:id/delete', async (req, res) => {
    try {
        await db.none('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.redirect('/products');
    } catch (error) {
        next(error);
    }
});

module.exports = router; 