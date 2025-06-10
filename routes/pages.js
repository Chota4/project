const express = require('express');
const router = express.Router();

// About page route
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Us - Addidas Management System'
    });
});

// Features page route
router.get('/features', (req, res) => {
    res.render('features', {
        title: 'Features - Addidas Management System'
    });
});

// Contact page route
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - Addidas Management System'
    });
});

// Handle contact form submission
router.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    // Here you would typically handle the form submission
    // For now, we'll just redirect back with a success message
    res.render('contact', {
        title: 'Contact Us - Addidas Management System',
        success: true,
        form: req.body
    });
});

module.exports = router; 