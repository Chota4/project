// Ensure user is authenticated (for protected routes)
const ensureAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } 
  res.redirect('/login');
};

// Forward authenticated users away from login/signup pages
const forwardAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};


module.exports = { ensureAuth, forwardAuth };
