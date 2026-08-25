const mongoose = require('mongoose');

// Contact Form Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxLength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    service: {
        type: String,
        required: [true, 'Service selection is required'],
        enum: {
            values: ['weddings', 'events', 'corporate', 'concerts', 'product', 'food', 'advertisement'],
            message: 'Please select a valid service'
        }
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxLength: [2000, 'Message cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived'],
        default: 'new'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ service: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ submittedAt: -1 });

// Virtual for service display name
contactSchema.virtual('serviceDisplayName').get(function() {
    const serviceNames = {
        weddings: 'Wedding Cinematography',
        events: 'Event Cinematography',
        corporate: 'Corporate Films',
        concerts: 'Concert Cinematography',
        product: 'Product Photography',
        food: 'Food Photography',
        advertisement: 'Advertisement Films'
    };
    return serviceNames[this.service] || this.service;
});

// Instance method to mark as read
contactSchema.methods.markAsRead = function() {
    this.status = 'read';
    return this.save();
};

// Static method to get contacts by service
contactSchema.statics.getByService = function(service) {
    return this.find({ service }).sort({ submittedAt: -1 });
};

// Static method to get recent contacts
contactSchema.statics.getRecent = function(limit = 10) {
    return this.find().sort({ submittedAt: -1 }).limit(limit);
};

module.exports = mongoose.model('Contact', contactSchema);
