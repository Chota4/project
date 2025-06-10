# Adidas Management System

A comprehensive management system for Adidas products, inventory, and sales tracking.

## Features

- Product Management
  - Add, update, and remove products
  - Categorize products (Footwear, Apparel, Accessories, Equipment)
  - Track product details (SKU, sizes, colors, etc.)

- Inventory Management
  - Track stock levels across warehouses
  - Monitor low stock items
  - Manage product restocking
  - Real-time inventory updates

- Sales Management
  - Process and track orders
  - Handle multiple payment methods
  - Track order status and shipping
  - Generate sales statistics and reports

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- pg-promise
- Express Validator
- JSON Web Token (JWT)
- EJS Template Engine

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd adidas-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adidas_management
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

4. Initialize the database:
```bash
# Create the database
createdb adidas_management

# Initialize database schema
npm run db:init
```

5. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Database Schema

### Products
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- sku (VARCHAR, UNIQUE)
- category (VARCHAR)
- sub_category (VARCHAR)
- price (DECIMAL)
- color (VARCHAR)
- description (TEXT)
- gender (VARCHAR)
- sport (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Product Sizes
- id (SERIAL PRIMARY KEY)
- product_id (INTEGER, FK)
- size (VARCHAR)
- quantity (INTEGER)

### Product Images
- id (SERIAL PRIMARY KEY)
- product_id (INTEGER, FK)
- image_url (VARCHAR)

### Inventory
- id (SERIAL PRIMARY KEY)
- product_id (INTEGER, FK)
- warehouse (VARCHAR)
- location (VARCHAR)
- quantity (INTEGER)
- minimum_stock (INTEGER)
- last_restocked (TIMESTAMP)
- status (VARCHAR)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Sales
- id (SERIAL PRIMARY KEY)
- order_number (VARCHAR, UNIQUE)
- customer_name (VARCHAR)
- customer_email (VARCHAR)
- customer_phone (VARCHAR)
- shipping_address fields
- total_amount (DECIMAL)
- payment_method (VARCHAR)
- payment_status (VARCHAR)
- order_status (VARCHAR)
- shipping_method (VARCHAR)
- tracking_number (VARCHAR)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Sale Items
- id (SERIAL PRIMARY KEY)
- sale_id (INTEGER, FK)
- product_id (INTEGER, FK)
- quantity (INTEGER)
- size (VARCHAR)
- price (DECIMAL)

## API Endpoints

### Products
- GET /api/products - Get all products
- GET /api/products/:id - Get a single product
- POST /api/products - Create a new product
- PUT /api/products/:id - Update a product
- DELETE /api/products/:id - Delete a product (soft delete)

### Inventory
- GET /api/inventory - Get all inventory items
- GET /api/inventory/product/:productId - Get inventory by product
- GET /api/inventory/low-stock - Get low stock items
- POST /api/inventory - Create new inventory entry
- PUT /api/inventory/:id - Update inventory
- POST /api/inventory/:id/restock - Restock inventory

### Sales
- GET /api/sales - Get all sales
- GET /api/sales/:id - Get sale by ID
- POST /api/sales - Create new sale
- PUT /api/sales/:id/status - Update sale status
- GET /api/sales/stats/summary - Get sales statistics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
