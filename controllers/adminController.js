const pool = require('../config/db');

const getAdminDashboard = async (req, res) => {
  try {
    const userResult = await pool.query('SELECT COUNT(*) FROM users');
    const capsuleResult = await pool.query('SELECT COUNT(*) FROM capsules');

    const totalUsers = userResult.rows[0].count;
    const totalCapsules = capsuleResult.rows[0].count;

    res.render('admin/dashboard', {
      admin: req.session.user,
      totalUsers,
      totalCapsules,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    res.render('admin/users', {
      admin: req.session.user,
      users: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading users');
  }
};


const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Failed to delete user');
  }
};

const getAllCapsules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT capsules.*, users.name, users.email
      FROM capsules
      JOIN users ON capsules.user_id = users.id
      ORDER BY capsules.created_at DESC
    `);

    res.render('admin/capsules', { capsules: result.rows });
  } catch (err) {
    console.error('Error fetching capsules:', err);
    res.status(500).send('Server error');
  }
};


const deleteCapsule = async (req, res) => {
  try {
    await pool.query('DELETE FROM capsules WHERE id = $1', [req.params.id]);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Delete capsule error:', err);
    res.status(500).send('Server Error');
  }
};

module.exports = { getAdminDashboard,  getAllUsers, deleteUser,getAllCapsules, deleteCapsule };
