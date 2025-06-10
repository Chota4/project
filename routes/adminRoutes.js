const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getAdminDashboard);
router.get('/users', adminController.getAllUsers);
router.post('/users/:id/delete', adminController.deleteUser);
router.get('/capsules', adminController.getAllCapsules);


module.exports = router;
