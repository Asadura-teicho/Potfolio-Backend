/**
 * Admin Content Controller
 * Handles content management (Banners, News, FAQs, Static Pages)
 */

const Content = require('../../models/Content.model');
const { logAdminAction, getIpAddress, getUserAgent } = require('../../utils/adminLogger');

// -------------------------------------------
// @desc    Get all content (with filters and pagination)
// @route   GET /api/admin/content
// @access  Private (Admin only)
// -------------------------------------------
exports.getContent = async (req, res) => {
  try {
    const {
      type,
      status,
      search,
      limit = 20,
      page = 1,
    } = req.query;

    const query = {};

    // Type filter (required)
    if (type) {
      query.type = type;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const content = await Content.find(query)
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Content.countDocuments(query);

    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Get content by ID
// @route   GET /api/admin/content/:id
// @access  Private (Admin only)
// -------------------------------------------
exports.getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Create new content
// @route   POST /api/admin/content
// @access  Private (Admin only)
// -------------------------------------------
exports.createContent = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      type,
      title,
      slug,
      content,
      excerpt,
      image,
      link,
      author,
      featuredImage,
      category,
      order,
      status,
      metaTitle,
      metaDescription,
      publishedAt,
    } = req.body;

    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({
        message: 'Type and title are required',
      });
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Check if slug already exists
    const existingContent = await Content.findOne({ slug: finalSlug });
    if (existingContent) {
      return res.status(400).json({
        message: 'Content with this slug already exists',
      });
    }

    // Create content
    const newContent = await Content.create({
      type,
      title,
      slug: finalSlug,
      content: content || '',
      excerpt: excerpt || '',
      image: image || null,
      link: link || null,
      author: author || null,
      featuredImage: featuredImage || null,
      category: category || null,
      order: order || 0,
      status: status || 'draft',
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      publishedAt: publishedAt ? new Date(publishedAt) : (status === 'published' ? new Date() : null),
    });

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'content_created',
      targetType: 'content',
      targetId: newContent._id,
      description: `${type} "${title}" created`,
      after: newContent.toObject(),
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json({
      message: 'Content created successfully',
      content: newContent,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Content with this slug already exists',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Update content
// @route   PUT /api/admin/content/:id
// @access  Private (Admin only)
// -------------------------------------------
exports.updateContent = async (req, res) => {
  try {
    const adminId = req.user.id;
    const contentId = req.params.id;

    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const before = { ...content.toObject() };

    // Update fields
    const allowedFields = [
      'title',
      'slug',
      'content',
      'excerpt',
      'image',
      'link',
      'author',
      'featuredImage',
      'category',
      'order',
      'status',
      'metaTitle',
      'metaDescription',
      'publishedAt',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'publishedAt') {
          content[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else if (field === 'status' && req.body[field] === 'published' && !content.publishedAt) {
          content.publishedAt = new Date();
        } else {
          content[field] = req.body[field];
        }
      }
    });

    await content.save();
    const after = { ...content.toObject() };

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'content_updated',
      targetType: 'content',
      targetId: content._id,
      description: `${content.type} "${content.title}" updated`,
      before,
      after,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { updatedFields: Object.keys(req.body) },
    });

    res.json({
      message: 'Content updated successfully',
      content,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Content with this slug already exists',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Delete content
// @route   DELETE /api/admin/content/:id
// @access  Private (Admin only)
// -------------------------------------------
exports.deleteContent = async (req, res) => {
  try {
    const adminId = req.user.id;
    const contentId = req.params.id;

    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const before = { ...content.toObject() };

    await Content.findByIdAndDelete(contentId);

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'content_deleted',
      targetType: 'content',
      targetId: contentId,
      description: `${content.type} "${content.title}" deleted`,
      before,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.json({
      message: 'Content deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

