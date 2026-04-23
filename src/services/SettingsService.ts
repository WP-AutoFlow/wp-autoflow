import { SettingModel } from '../models/Setting';
import { logger } from '../utils/logger';

class SettingsService {
    private cache: any = null;
    private lastFetch = 0;
    private CACHE_TTL = 60000;

    async getSettings() {
        const now = Date.now();

        if (this.cache && (now - this.lastFetch < this.CACHE_TTL)) {
            return this.cache;
        }

        let settings = await SettingModel.findOne();

        if (!settings) {
            settings = await SettingModel.create({ isConfigured: false });
        }

        this.cache = settings;
        this.lastFetch = now;
        return settings;
    }

    async updateSettings(data: any) {
        try {
            const settings = await SettingModel.findOneAndUpdate(
                {},
                { ...data, isConfigured: true },
                { new: true, upsert: true }
            );

            this.cache = settings;
            this.lastFetch = Date.now();

            logger.info('Settings updated successfully.');
            return settings;
        } catch (error) {
            logger.error('Error saving settings to the database:', error);
            throw error;
        }
    }
}

export const settingsService = new SettingsService();