/**
 * Public Content Controller
 * Handles public content operations (FAQs, Help, Pages)
 */

const Content = require('../models/Content.model');

// -------------------------------------------
// @desc    Get all content pages
// @route   GET /api/content/pages
// @access  Public
// -------------------------------------------
exports.getContentPages = async (req, res) => {
  try {
    const { type, category, page = 1, limit = 20 } = req.query;

    const query = {
      status: 'published',
    };

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    const content = await Content.find(query)
      .sort({ order: 1, publishedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Content.countDocuments(query);

    res.json({
      pages: content,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Get content by slug
// @route   GET /api/content/:slug
// @access  Public
// -------------------------------------------
exports.getContentBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const content = await Content.findOne({
      slug,
      status: 'published',
    }).select('-__v');

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json({ content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Get FAQ content
// @route   GET /api/content/faq
// @access  Public
// -------------------------------------------
exports.getFAQContent = async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;

    const query = {
      type: 'faq',
      status: 'published',
    };

    // Filter by category if provided
    if (category && category !== 'all') {
      query.category = category;
    }

    const faqs = await Content.find(query)
      .sort({ order: 1, publishedAt: -1 })
      .limit(parseInt(limit))
      .select('title content category order slug')
      .select('-__v');

    res.json({
      faqs,
      total: faqs.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Get help content
// @route   GET /api/content/help
// @access  Public
// -------------------------------------------
exports.getHelpContent = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const query = {
      type: { $in: ['help', 'guide', 'tutorial'] },
      status: 'published',
    };

    // Filter by category if provided
    if (category && category !== 'all') {
      query.category = category;
    }

    const helpContent = await Content.find(query)
      .sort({ order: 1, publishedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Content.countDocuments(query);

    res.json({
      help: helpContent,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
