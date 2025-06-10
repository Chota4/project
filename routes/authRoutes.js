const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const { forwardAuth, ensureAuth } = require('../middleware/authMiddleware');

// Landing page route
router.get('/', forwardAuth, authController.getLanding);

// Dashboard route (protected)
router.get('/dashboard', ensureAuth, dashboardController.getDashboard);

// Auth routes
router.get('/signup', forwardAuth, authController.getSignup);
router.post('/signup', authController.postSignup);
router.get('/login', forwardAuth, authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

module.exports = router;
