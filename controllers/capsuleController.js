const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const {
  createCapsule,
  getAllCapsulesByUser,
  getCapsuleById,
  updateCapsule,
  deleteCapsule : deleteCapsuleFromModel
} = require('../models/capsuleModel');

// GET: Show form to create a capsule
const getCreateCapsule = (req, res) => {
  res.render('capsules/create');
};

// POST: Handle creation of a new capsule
const postCreateCapsule = async (req, res) => {
  const { title, message, unlock_date } = req.body;
  const attachment = req.file ? req.file.filename : null;

  try {
    await createCapsule(req.session.user.id, title, message, unlock_date, attachment);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('capsules/create', { error: 'Error creating capsule.' });
  }
};

// GET: List all capsules of logged-in user
const getDashboard = async (req, res) => {
  try {
    const capsules = await getAllCapsulesByUser(req.session.user.id);
    res.render('dashboard', { capsules });
  } catch (err) {
    console.error(err);
    res.render('dashboard', { error: 'Failed to load capsules.' });
  }
};

// GET: View individual capsule
const viewCapsule = async (req, res) => {
  const capsuleId = req.params.id;
  const userId = req.session.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM capsules WHERE id = $1 AND user_id = $2',
      [capsuleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Capsule not found');
    }

    const capsule = result.rows[0];

    const now = new Date();
    const unlockDate = new Date(capsule.unlock_date);

    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const unlockDateOnly = new Date(unlockDate.getFullYear(), unlockDate.getMonth(), unlockDate.getDate());

    const isUnlocked = unlockDateOnly <= nowDateOnly;

    res.render('capsules/details', { capsule, isUnlocked });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};


// GET: Load edit form
const getEditCapsule = async (req, res) => {
  const capsuleId = req.params.id;
  const userId = req.session.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM capsules WHERE id = $1 AND user_id = $2',
      [capsuleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Capsule not found');
    }

    const capsule = result.rows[0];

    const now = new Date();
    const unlockDate = new Date(capsule.unlock_date);

    // Compare only dates (ignoring time)
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const unlockDateOnly = new Date(unlockDate.getFullYear(), unlockDate.getMonth(), unlockDate.getDate());

    // 🔐 Check: allow edit only if unlock date is today or earlier
    if (unlockDateOnly > nowDateOnly) {
      return res.render('capsules/locked', { capsuleId: capsule.id });
    }

    // ✅ Unlock date is today or before → allow editing
    res.render('capsules/edit', { capsule });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

// POST: Update edited capsule
const postEditCapsule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, unlock_date } = req.body;

    // First, check if capsule is eligible for editing
    const result = await pool.query(
      'SELECT unlock_date, attachment FROM capsules WHERE id = $1 AND user_id = $2',
      [id, req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Capsule not found');
    }

    const capsule = result.rows[0];
    const unlockDate = new Date(capsule.unlock_date);
    const now = new Date();

    // Normalize both dates to remove time part for "date-only" comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const unlockDateOnly = new Date(unlockDate.getFullYear(), unlockDate.getMonth(), unlockDate.getDate());

    // ✅ Allow edit only if unlock date is today or before today
    if (unlockDateOnly > today) {
      return res.status(403).send('Editing locked: unlock date has not arrived yet');
    }

    let attachment = capsule.attachment;
    if (req.file) {
      attachment = req.file.filename;
    }

    const updateQuery = `
      UPDATE capsules
      SET title = $1,
          message = $2,
          unlock_date = $3,
          attachment = $4
      WHERE id = $5 AND user_id = $6
    `;

    await pool.query(updateQuery, [title, message, unlock_date, attachment, id, req.session.user.id]);

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).send('Update failed: ' + err.message);
  }
};


// POST: Delete capsule
const deleteCapsule = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const capsuleId = req.params.id;

    // 1. Get the capsule to verify ownership and retrieve attachment file name
    const result = await pool.query(
      'SELECT attachment FROM capsules WHERE id = $1 AND user_id = $2',
      [capsuleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Capsule not found');
    }

    const filePath = result.rows[0].attachment;

    // 2. Delete the file from filesystem if it exists
    if (filePath) {
      const fullPath = path.join(__dirname, '../public/uploads/', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // 3. Delete the capsule record from the database
    await pool.query(
      'DELETE FROM capsules WHERE id = $1 AND user_id = $2',
      [capsuleId, userId]
    );

    // 4. Redirect back to dashboard
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error in deleteCapsule:', err);
    res.status(500).send('Server error');
  }
};


module.exports = {
  createCapsule,
  getDashboard,
  getCreateCapsule,
  postCreateCapsule,
  viewCapsule,
  getEditCapsule,
  postEditCapsule,
  deleteCapsule
};
