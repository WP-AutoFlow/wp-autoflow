import mongoose, { Schema } from 'mongoose';

const PostSchema = new mongoose.Schema({
    site: { type: Schema.Types.ObjectId, ref: 'Site', required: false, index: true },

    postId: Number,
    postIdInternal: Number,
    slug: String,
    source: String,
    link: String,

    originalTitle: String,
    generateTitle: String,

    originalContent: String,
    generateContent: String,

    createdAt: { type: Date, default: Date.now }
});

PostSchema.index({ site: 1, postId: 1 }, { unique: true });

export const PostModel = mongoose.model('Post', PostSchema);