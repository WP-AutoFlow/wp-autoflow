import mongoose, { Schema, Document } from 'mongoose';

export interface ITargetPost extends Document {
    wpId: number;
    title: string;
    link: string;
    slug: string;
}

const TargetPostSchema = new Schema({
    wpId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    link: { type: String, required: true },
    slug: { type: String, required: true }
}, {
    timestamps: true
});

TargetPostSchema.index({ title: 'text', slug: 'text' });

export const TargetPostModel = mongoose.model<ITargetPost>('TargetPost', TargetPostSchema);