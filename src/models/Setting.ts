import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
    isConfigured: boolean;
    cronSchedule: string;
    runOnStartup: boolean;

    execution: {
        mode: string;
        concurrency: number;
        staggerDelay: number;
    };

    wp: {
        api?: string;
        user?: string;
        password?: string;
    };

    images: {
        uploadEnabled: boolean;
        watermarkUrl?: string;
    };

    proxy: {
        enabled: boolean;
        scrapeDoToken?: string;
        url?: string;
    };

    ai: {
        enabled: boolean;
        rewriteContent: boolean;
        language: string;
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        titlePrompt?: string;
        contentPrompt?: string;
        contentTone?: string;
    };

    integrations: {
        webhook: {
            enabled: boolean;
            url: string;
        };
    };

    indexing: {
        indexNow: {
            enabled: boolean;
            apiKey: string;
        };
        speedyIndex: {
            enabled: boolean;
            apiKey: string;
            payPerIndexed: boolean;
        };
    };

    seo: {
        linkBuildingEnabled: boolean;
    };
}

const SettingSchema = new Schema({
    isConfigured: { type: Boolean, default: false },
    cronSchedule: { type: String, default: '0 */1 * * *' },
    runOnStartup: { type: Boolean, default: false },

    execution: {
        mode: { type: String, default: 'sequential' },
        concurrency: { type: Number, default: 5 },
        staggerDelay: { type: Number, default: 5000 }
    },

    wp: {
        api: { type: String, default: '' },
        user: { type: String, default: '' },
        password: { type: String, default: '' }
    },

    images: {
        uploadEnabled: { type: Boolean, default: false },
        watermarkUrl: { type: String, default: '' }
    },

    proxy: {
        enabled: { type: Boolean, default: false },
        scrapeDoToken: { type: String, default: '' },
        url: { type: String, default: '' }
    },

    ai: {
        enabled: { type: Boolean, default: false },
        rewriteContent: { type: Boolean, default: false },
        language: { type: String, default: 'pt' },
        baseUrl: { type: String, default: 'https://api.openai.com/v1' },
        apiKey: { type: String, default: '' },
        model: { type: String, default: 'gpt-5-mini' },
        titlePrompt: { type: String, default: '' },
        contentPrompt: { type: String, default: '' },
        contentTone: { type: String, default: 'neutral' }
    },

    integrations: {
        webhook: {
            enabled: { type: Boolean, default: false },
            url: { type: String, default: '' }
        }
    },

    indexing: {
        indexNow: {
            enabled: { type: Boolean, default: false },
            apiKey: { type: String, default: '' }
        },
        speedyIndex: {
            enabled: { type: Boolean, default: false },
            apiKey: { type: String, default: '' },
            payPerIndexed: { type: Boolean, default: false }
        }
    },

    seo: {
        linkBuildingEnabled: { type: Boolean, default: false }
    }
}, {
    timestamps: true,
    strict: true
});

export const SettingModel = mongoose.model<ISetting>('Setting', SettingSchema);