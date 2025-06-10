const db = require('../db');

const getDashboard = async (req, res) => {
    try {
        // Get total products
        const productsResult = await db.one('SELECT COUNT(*) as total FROM products');
        const totalProducts = parseInt(productsResult.total);

        // Get total stock
        const stockResult = await db.one('SELECT SUM(quantity) as total FROM inventory');
        const totalStock = parseInt(stockResult.total || 0);

        // Get total sales and revenue
        const salesResult = await db.one(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue
            FROM sales
        `);
        const totalSales = parseInt(salesResult.total_sales);
        const totalRevenue = parseFloat(salesResult.total_revenue);

        // Get all products with price as numeric
        const products = await db.manyOrNone(`
            SELECT 
                p.id,
                p.name,
                p.category,
                CAST(p.price AS FLOAT) as price,
                p.description,
                COALESCE(i.quantity, 0) as stock
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            ORDER BY p.created_at DESC
        `);

        // Get recent sales
        const recentSales = await db.manyOrNone(`
            SELECT 
                s.*,
                p.name as product_name
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        // Get recent activity
        const recentActivity = await db.manyOrNone(`
            SELECT 
                'sale' as type,
                'Sale completed' as description,
                created_at as date,
                'completed' as status
            FROM sales
            UNION ALL
            SELECT 
                'inventory' as type,
                'Stock updated' as description,
                updated_at as date,
                'completed' as status
            FROM inventory
            ORDER BY date DESC
            LIMIT 10
        `);

        // Get low stock items (less than 10 items)
        const lowStockItems = await db.manyOrNone(`
            SELECT 
                p.name,
                i.quantity as stock,
                p.id
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE i.quantity < 10
            ORDER BY i.quantity ASC
            LIMIT 5
        `);

        // Get sales data for chart
        const salesChartData = await db.manyOrNone(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue
            FROM sales
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        // Get category data for chart
        const categoryChartData = await db.manyOrNone(`
            SELECT 
                p.category,
                COUNT(*) as total_products,
                COALESCE(SUM(s.quantity), 0) as total_sales
            FROM products p
            LEFT JOIN sales s ON p.id = s.product_id
            GROUP BY p.category
        `);

        res.render('dashboard', {
            title: 'Dashboard - Addidas Management System',
            stats: {
                totalProducts,
                totalStock,
                totalSales,
                totalRevenue
            },
            products,
            recentSales,
            recentActivity,
            lowStockItems,
            salesChartData,
            categoryChartData
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.render('dashboard', {
            title: 'Dashboard - Addidas Management System',
            stats: {
                totalProducts: 0,
                totalStock: 0,
                totalSales: 0,
                totalRevenue: 0
            },
            products: [],
            recentSales: [],
            recentActivity: [],
            lowStockItems: [],
            salesChartData: [],
            categoryChartData: []
        });
    }
};

// API endpoints for CRUD operations
const createProduct = async (req, res) => {
    try {
        const { name, category, price, stock, description } = req.body;
        
        // Start a transaction
        await db.tx(async t => {
            // Insert product
            const product = await t.one(`
                INSERT INTO products (name, category, price, description)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [name, category, price, description]);

            // Insert initial stock
            if (stock > 0) {
                await t.none(`
                    INSERT INTO inventory (product_id, quantity)
                    VALUES ($1, $2)
                `, [product.id, stock]);
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({ success: false, error: 'Error creating product' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, description } = req.body;

        await db.none(`
            UPDATE products
            SET name = $1, category = $2, price = $3, description = $4
            WHERE id = $5
        `, [name, category, price, description, id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ success: false, error: 'Error updating product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Start a transaction
        await db.tx(async t => {
            // Delete inventory records
            await t.none('DELETE FROM inventory WHERE product_id = $1', [id]);
            
            // Delete sales records
            await t.none('DELETE FROM sales WHERE product_id = $1', [id]);
            
            // Delete product
            await t.none('DELETE FROM products WHERE id = $1', [id]);
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({ success: false, error: 'Error deleting product' });
    }
};

const createSale = async (req, res) => {
    try {
        const { product_id, quantity, total_amount } = req.body;

        // Start a transaction
        await db.tx(async t => {
            // Create sale record
            await t.none(`
                INSERT INTO sales (product_id, quantity, total_amount)
                VALUES ($1, $2, $3)
            `, [product_id, quantity, total_amount]);

            // Update inventory
            await t.none(`
                UPDATE inventory
                SET quantity = quantity - $1
                WHERE product_id = $2
            `, [quantity, product_id]);
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Create Sale Error:', error);
        res.status(500).json({ success: false, error: 'Error creating sale' });
    }
};

const updateStock = async (req, res) => {
    try {
        const { product_id, quantity } = req.body;

        await db.tx(async t => {
            // Check if inventory record exists
            const exists = await t.oneOrNone('SELECT 1 FROM inventory WHERE product_id = $1', [product_id]);

            if (exists) {
                // Update existing record
                await t.none(`
                    UPDATE inventory
                    SET quantity = $1, updated_at = NOW()
                    WHERE product_id = $2
                `, [quantity, product_id]);
            } else {
                // Create new record
                await t.none(`
                    INSERT INTO inventory (product_id, quantity)
                    VALUES ($1, $2)
                `, [product_id, quantity]);
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update Stock Error:', error);
        res.status(500).json({ success: false, error: 'Error updating stock' });
    }
};

module.exports = {
    getDashboard,
    createProduct,
    updateProduct,
    deleteProduct,
    createSale,
    updateStock
}; 