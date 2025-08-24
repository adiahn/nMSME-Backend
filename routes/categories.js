const express = require('express');
const router = express.Router();

// Categories matching the original PRD exactly
const categories = [
  {
    id: 1,
    name: 'Fashion',
    description: 'Fashion and apparel businesses including clothing, accessories, and textile manufacturing',
    slug: 'fashion',
    is_active: true
  },
  {
    id: 2,
    name: 'Information Technology (IT)',
    description: 'Technology businesses including software development, digital services, and tech solutions',
    slug: 'information-technology',
    is_active: true
  },
  {
    id: 3,
    name: 'Agribusiness',
    description: 'Agricultural businesses including farming, processing, and agricultural technology',
    slug: 'agribusiness',
    is_active: true
  },
  {
    id: 4,
    name: 'Food & Beverage',
    description: 'Food and beverage businesses including restaurants, food processing, and catering',
    slug: 'food-beverage',
    is_active: true
  },
  {
    id: 5,
    name: 'Light Manufacturing',
    description: 'Light manufacturing businesses including production, assembly, and processing',
    slug: 'light-manufacturing',
    is_active: true
  },
  {
    id: 6,
    name: 'Creative Enterprise',
    description: 'Creative businesses including arts, media, entertainment, and design',
    slug: 'creative-enterprise',
    is_active: true
  },
  {
    id: 7,
    name: 'Emerging Enterprise Award',
    description: 'Special nano category for emerging and innovative enterprises',
    slug: 'emerging-enterprise',
    is_active: true,
    is_special: true
  }
];

// MSME Strata definitions from PRD
const msmeStrata = [
  {
    id: 'nano',
    name: 'Nano',
    description: '1-2 Staff or Sales less than ₦100,000 per month',
    staff_range: '1-2',
    sales_threshold: 100000,
    asset_range: null
  },
  {
    id: 'micro',
    name: 'Micro',
    description: '3-9 Staff or Assets ₦500k to ₦2.5m',
    staff_range: '3-9',
    sales_threshold: null,
    asset_range: { min: 500000, max: 2500000 }
  },
  {
    id: 'small',
    name: 'Small',
    description: '10-50 Staff or Assets ₦2.5m+ to ₦50m',
    staff_range: '10-50',
    sales_threshold: null,
    asset_range: { min: 2500000, max: 50000000 }
  },
  {
    id: 'medium',
    name: 'Medium',
    description: '51-199 Staff or Assets ₦50m+ to ₦500m',
    staff_range: '51-199',
    sales_threshold: null,
    asset_range: { min: 50000000, max: 500000000 }
  }
];

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: categories
  });
});

// @desc    Get MSME strata
// @route   GET /api/categories/msme-strata
// @access  Public
router.get('/msme-strata', (req, res) => {
  res.json({
    success: true,
    data: msmeStrata
  });
});

// @desc    Get specific category
// @route   GET /api/categories/:id
// @access  Public
router.get('/:id', (req, res) => {
  const category = categories.find(cat => cat.id == req.params.id || cat.slug === req.params.id);
  
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: category
  });
});

module.exports = router;
