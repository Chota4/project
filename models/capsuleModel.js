const pool = require('../config/db');

// Create a new capsule
const createCapsule = async (userId, title, message, unlock_date, attachment) => {
  const query = `
    INSERT INTO capsules (user_id, title, message, unlock_date, attachment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [userId, title, message, unlock_date, attachment];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all capsules by user ID
const getAllCapsulesByUser = async (userId) => {
  const query = `
    SELECT * FROM capsules
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Get capsule by capsule ID
const getCapsuleById = async (id) => {
  const query = `
    SELECT * FROM capsules WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Update capsule by ID
const updateCapsule = async (id, title, message, unlock_date) => {
  const query = `
    UPDATE capsules
    SET title = $1, message = $2, unlock_date = $3
    WHERE id = $4
    RETURNING *;
  `;
  const values = [title, message, unlock_date, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete capsule by ID
const deleteCapsule = async (id) => {
  const query = `
    DELETE FROM capsules WHERE id = $1;
  `;
  await pool.query(query, [id]);
};

module.exports = {
  createCapsule,
  getAllCapsulesByUser,
  getCapsuleById,
  updateCapsule,
  deleteCapsule
};
