require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');

// Import routes
const contactRoutes = require('./routes/contact');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:3000',
        'https://vedang-portfolio.vercel.app',
        'https://vedang-portfolio.onrender.com'
    ];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In development, be more permissive
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`CORS blocked origin: ${origin}`);
            console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Special rate limit for contact form
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 contact form submissions per 15 minutes
    message: {
        success: false,
        message: 'Too many contact form submissions. Please try again in 15 minutes.'
    },
    skip: (req, res) => {
        // Skip rate limiting for GET requests (viewing contacts)
        return req.method === 'GET';
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for getting real IP addresses)
app.set('trust proxy', 1);

// Serve static files (for admin panel)
app.use('/admin', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/contact', contactLimiter, contactRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Vedang Cinematography Portfolio API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            contact: '/api/contact',
            contactStats: '/api/contact/stats'
        }
    });
});

// Maintenance mode middleware: serve temporary "down for maintenance" page when enabled
const maintenanceFlagPath = path.join(__dirname, '..', 'maintenance.flag');

function maintenanceEnabled() {
    return process.env.MAINTENANCE === 'true' || fs.existsSync(maintenanceFlagPath);
}

app.use((req, res, next) => {
    if (!maintenanceEnabled()) return next();

    // Allow health checks, admin UI and API to continue working during maintenance
    if (req.path.startsWith('/health') || req.path.startsWith('/admin') || req.path.startsWith('/api')) {
        return next();
    }

    // For non-GET requests return JSON 503
    if (req.method !== 'GET') {
        res.set('Retry-After', '3600'); // seconds
        return res.status(503).json({ success: false, message: 'Service temporarily down for maintenance' });
    }

    // Serve maintenance page for regular GET requests
    res.set('Retry-After', '3600');
    res.status(503).sendFile(path.join(__dirname, '..', 'maintenance.html'), (err) => {
        if (err) next(err);
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        requestedPath: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Global error handler:', error);
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});
