import mongoose from 'mongoose';

const SiteSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    categoryId: { type: Number, default: 1 },
    scrapeStrategy: { type: String, default: 'wordpress_v2' },
    lastRun: { type: Date },
    lastError: { type: String }
}, { timestamps: true });

export const SiteModel = mongoose.model('Site', SiteSchema);