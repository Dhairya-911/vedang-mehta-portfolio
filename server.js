require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');

// Import routes
const contactRoutes = require('./routes/contact');

const app = express();

// Disable X-Powered-By header to obscure technology stack
app.disable('x-powered-by');

// Connect to MongoDB
connectDB();

// Trust proxy (important for reverse proxies like Render, Vercel, Netlify, Nginx)
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdn.jsdelivr.net",
                "data:"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://vedang-portfolio-kgdn.onrender.com",
                "https://vedang-portfolio.vercel.app",
                "https://vedang-portfolio.netlify.app",
                "https://*.vercel.app",
                "https://*.netlify.app",
                "https://*.onrender.com"
            ],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' }
}));

// CORS configuration
const defaultOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://vedang-portfolio.vercel.app',
    'https://vedang-portfolio.netlify.app',
    'https://vedang-portfolio-kgdn.onrender.com'
];

const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
    : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        const cleanOrigin = origin.replace(/\/$/, '');

        // Check exact match or trusted domain patterns
        const isAllowed = 
            allowedOrigins.includes(cleanOrigin) ||
            cleanOrigin.endsWith('.vercel.app') ||
            cleanOrigin.endsWith('.netlify.app') ||
            cleanOrigin.endsWith('.onrender.com') ||
            /^https?:\/\/localhost(:\d+)?$/.test(cleanOrigin) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(cleanOrigin);

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`🔒 CORS blocked unauthorized origin: ${origin}`);
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Admin-Key']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing with safe size limits (mitigate memory exhaustion / DoS attacks)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Global Rate Limiter
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // 100 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS'
});

app.use(globalLimiter);

// Contact Submission Specific Rate Limiter (strictly limits form spam)
const contactSubmissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 submissions per 15 minutes per IP
    message: {
        success: false,
        message: 'Too many contact form submissions from this IP. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Admin API Rate Limiter (prevents brute forcing admin credentials)
const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: 'Too many admin requests. Please wait a few minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Serve static files for admin dashboard
app.use('/admin', express.static(path.join(__dirname, 'public'), {
    dotfiles: 'ignore',
    etag: true,
    index: ['index.html', 'admin.html'],
    maxAge: '1h'
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV === 'development' ? 'development' : 'production'
    });
});

// Apply rate limiting to contact POST endpoint
app.post('/api/contact', contactSubmissionLimiter);

// Apply admin rate limiting to admin endpoints
app.use('/api/contact/verify-auth', adminRateLimiter);
app.get('/api/contact', adminRateLimiter);
app.get('/api/contact/stats', adminRateLimiter);
app.put('/api/contact/:id/status', adminRateLimiter);

// API routes
app.use('/api/contact', contactRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Vedang Cinematography Portfolio API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            contact: '/api/contact'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Global error handler (prevents internal stack trace leakage)
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error.message || error);

    const isCORS = error.message === 'Blocked by CORS policy';
    const status = isCORS ? 403 : (error.status || 500);

    res.status(status).json({
        success: false,
        message: isCORS ? 'Access forbidden by CORS policy' : (status === 500 ? 'An internal error occurred. Please try again later.' : error.message)
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server securely running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server process terminated');
    });
});

module.exports = app;
