const express = require('express');
const router = express.Router();

// Placeholder for public routes
router.get('/', (req, res) => {
  res.json({ message: 'Public routes - to be implemented' });
});

module.exports = router;
