const express = require('express');
const mongoose = require('mongoose');
const { body, query, param, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { requireAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Supported service types
const VALID_SERVICES = ['weddings', 'events', 'corporate', 'concerts', 'product', 'food', 'advertisement'];
const VALID_STATUSES = ['new', 'read', 'replied', 'archived'];

// Contact submission validation middleware
const validateContact = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[\p{L}\s.'-]+$/u)
        .withMessage('Name can only contain letters, spaces, hyphens, dots, and apostrophes')
        .escape(),
    
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 254 })
        .withMessage('Email address is too long'),
    
    body('service')
        .trim()
        .isIn(VALID_SERVICES)
        .withMessage('Please select a valid service option'),
    
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
        // Strip null bytes and control characters
        .customSanitizer(val => typeof val === 'string' ? val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') : '')
];

// @route   POST /api/contact/verify-auth
// @desc    Verify admin authentication credentials
// @access  Admin Only (Protected)
router.post('/verify-auth', requireAdminAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Admin authorization verified successfully.'
    });
});

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public (Rate-limited)
router.post('/', validateContact, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed. Please check your input.',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        const { name, email, service, message } = req.body;

        // Check for duplicate submission (same email and message in last 5 minutes) to prevent spamming
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingContact = await Contact.findOne({
            email: String(email).toLowerCase(),
            message: String(message),
            submittedAt: { $gte: fiveMinutesAgo }
        }).lean();

        if (existingContact) {
            return res.status(429).json({
                success: false,
                message: 'Duplicate submission detected. Please wait a few minutes before submitting again.',
                retryAfter: 300
            });
        }

        // Sanitize client metadata
        const rawIp = req.ip || (req.connection && req.connection.remoteAddress) || '';
        const sanitizedIp = typeof rawIp === 'string' ? rawIp.slice(0, 45) : '';
        const rawUserAgent = req.get('User-Agent') || '';
        const sanitizedUserAgent = typeof rawUserAgent === 'string' ? rawUserAgent.slice(0, 255) : '';

        // Create new contact entry
        const contact = new Contact({
            name,
            email,
            service,
            message,
            ipAddress: sanitizedIp,
            userAgent: sanitizedUserAgent
        });

        await contact.save();

        console.log(`📩 New contact form submission from ${name} (${email}) for ${service}`);

        res.status(201).json({
            success: true,
            message: 'Thank you for your message! I will get back to you soon.',
            data: {
                id: contact._id,
                submittedAt: contact.submittedAt
            }
        });

    } catch (error) {
        console.error('❌ Error saving contact form submission:', error);
        
        res.status(500).json({
            success: false,
            message: 'Sorry, there was an error processing your message. Please try again later.'
        });
    }
});

// @route   GET /api/contact
// @desc    Get contacts list (with filtering and pagination)
// @access  Admin Only (Protected)
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const { status, service, search } = req.query;
        
        // Strict pagination bounds to prevent memory exhaustion
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;

        // Build sanitized MongoDB query (prevent NoSQL operator injection)
        const query = {};

        if (typeof status === 'string' && VALID_STATUSES.includes(status.trim())) {
            query.status = status.trim();
        }

        if (typeof service === 'string' && VALID_SERVICES.includes(service.trim())) {
            query.service = service.trim();
        }

        if (typeof search === 'string' && search.trim().length > 0) {
            // Escape special regex characters to prevent ReDoS / regex injection
            const sanitizedSearch = search.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { name: { $regex: sanitizedSearch, $options: 'i' } },
                { email: { $regex: sanitizedSearch, $options: 'i' } }
            ];
        }

        // Fetch contacts & total count in parallel
        const [contacts, total] = await Promise.all([
            Contact.find(query)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Contact.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: contacts,
            pagination: {
                current: page,
                total: Math.ceil(total / limit) || 1,
                count: contacts.length,
                totalRecords: total
            }
        });

    } catch (error) {
        console.error('❌ Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving contact enquiries.'
        });
    }
});

// @route   PUT /api/contact/:id/status
// @desc    Update contact status
// @access  Admin Only (Protected)
router.put('/:id/status', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate MongoDB ObjectId format
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid contact ID format.'
            });
        }

        // Validate status enum
        if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status.trim())) {
            return res.status(400).json({
                success: false,
                message: `Invalid status value. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        const contact = await Contact.findByIdAndUpdate(
            id,
            { status: status.trim() },
            { new: true, runValidators: true }
        ).lean();

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact enquiry not found.'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully.',
            data: contact
        });

    } catch (error) {
        console.error('❌ Error updating contact status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating contact status.'
        });
    }
});

// @route   GET /api/contact/stats
// @desc    Get contact statistics overview
// @access  Admin Only (Protected)
router.get('/stats', requireAdminAuth, async (req, res) => {
    try {
        const [overviewStats, serviceStats] = await Promise.all([
            Contact.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        newMessages: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
                        readMessages: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
                        repliedMessages: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
                        archivedMessages: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } }
                    }
                }
            ]),
            Contact.aggregate([
                {
                    $group: {
                        _id: '$service',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                overview: overviewStats[0] || { total: 0, newMessages: 0, readMessages: 0, repliedMessages: 0, archivedMessages: 0 },
                byService: serviceStats
            }
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics overview.'
        });
    }
});

module.exports = router;
