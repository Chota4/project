const express = require('express');
const router = express.Router();
const capsuleController = require('../controllers/capsuleController');
const multer = require('multer');
const path = require('path');
const { ensureAuth } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// ===================== ROUTES ======================= //

// Dashboard: List all capsules for logged-in user
router.get('/dashboard', ensureAuth, capsuleController.getDashboard);

// Show form to create a new capsule
router.get('/capsules/create', ensureAuth, capsuleController.getCreateCapsule);

// Handle form submission to create capsule
router.post(
  '/capsules/create',
  ensureAuth,
  upload.single('attachment'),
  capsuleController.postCreateCapsule
);

// View a single capsule (locked or unlocked)
router.get('/capsules/:id', ensureAuth, capsuleController.viewCapsule);

// Show edit capsule form
router.get('/capsules/:id/edit', ensureAuth, capsuleController.getEditCapsule);

// Handle edit capsule form submission
router.post('/capsules/:id/edit', upload.single('attachment'), capsuleController.postEditCapsule);

// Handle deletion of a capsule
router.post('/capsules/:id/delete', ensureAuth, capsuleController.deleteCapsule);

module.exports = router;
