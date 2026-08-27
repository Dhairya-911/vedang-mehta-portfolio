const crypto = require('crypto');

/**
 * Middleware to protect admin routes using constant-time token verification.
 * Checks for token in `Authorization: Bearer <token>` or `x-admin-key` header.
 */
const requireAdminAuth = (req, res, next) => {
    try {
        const expectedKey = process.env.ADMIN_API_KEY || process.env.JWT_SECRET;

        if (!expectedKey) {
            console.error('❌ Server security configuration error: ADMIN_API_KEY is not defined.');
            return res.status(500).json({
                success: false,
                message: 'Server security configuration error.'
            });
        }

        // Extract token from Authorization header or custom x-admin-key header
        let providedToken = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (authHeader && typeof authHeader === 'string') {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
                providedToken = parts[1];
            } else {
                providedToken = authHeader;
            }
        } else if (req.headers['x-admin-key']) {
            providedToken = req.headers['x-admin-key'];
        }

        if (!providedToken || typeof providedToken !== 'string') {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Missing admin authorization credentials.'
            });
        }

        // Use SHA-256 hash comparison with timingSafeEqual to prevent timing attacks
        const providedHash = crypto.createHash('sha256').update(providedToken.trim()).digest();
        const expectedHash = crypto.createHash('sha256').update(expectedKey.trim()).digest();

        const isMatch = crypto.timingSafeEqual(providedHash, expectedHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid admin credentials.'
            });
        }

        // Auth passed
        next();
    } catch (error) {
        console.error('❌ Error during admin authentication:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error occurred.'
        });
    }
};

module.exports = {
    requireAdminAuth
};
