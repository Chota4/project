const bcrypt = require('bcrypt');
require('dotenv').config();
const { createUser, findUserByEmail } = require('../models/userModel');

// GET: render landing page
const getLanding = (req, res) => {
  res.render('landing', {
    title: 'Welcome - Addidas Management System'
  });
};

// GET: render signup form
const getSignup = (req, res) => {
  res.render('signup', {
    title: 'Sign Up - Adidas Management System',
    error: undefined,
    message: undefined,
    name: '',
    email: ''
  });
};

// POST: handle signup
const postSignup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || password !== confirmPassword) {
    return res.render('signup', { error: 'Invalid input or passwords do not match.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hashedPassword);
    res.redirect('/login?signup=success');
  } catch (err) {
    console.error(err);
    res.render('signup', { error: 'Email already registered or error occurred.' });
  }
};

// GET: render login form
const getLogin = (req, res) => {
  const successMessage = req.query.signup === 'success' ? 'Signup successful! Please login.' : null;
  res.render('login', { successMessage });
};


// POST: Handle login
const postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ✅ Admin login via environment variables
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      req.session.user = {
        id: 0,
        name: 'Admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      };
      return res.redirect('/admin/dashboard');
    }

    // ✅ Normal user login via database
    const user = await findUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      return res.redirect('/dashboard');
    } else {
      return res.render('login', { error: 'Invalid email or password.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Login failed due to server error.' });
  }
};

// GET: logout
const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/login');
};

module.exports = {
  getLanding,
  getSignup,
  postSignup,
  getLogin,
  postLogin,
  logout
};
