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

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
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
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        const cleanOrigin = origin.replace(/\/$/, '');

        // Check exact match or trusted domain patterns (Vercel, Netlify, Render, Localhost)
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
            console.log(`CORS blocked origin: ${origin}`);
            console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
    skip: (req) => req.method === 'OPTIONS'
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
        // Skip rate limiting for GET (viewing) and OPTIONS (preflight) requests
        return req.method === 'GET' || req.method === 'OPTIONS';
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
