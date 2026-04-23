import axios from 'axios';
import moment from 'moment-timezone';
import { buildRequestConfig } from '../utils/requestHelper';
import { logger } from '../utils/logger';
import { settingsService } from './SettingsService';

export class ScraperService {
    static async fetchPosts(domain: string) {
        const settings = await settingsService.getSettings();

        const after = moment.utc().subtract(24, 'hours').format('YYYY-MM-DDTHH:mm:ss');

        const targetUrl = `${domain}/wp-json/wp/v2/posts?after=${after}&per_page=20&_embed=1`;

        const { url, options } = buildRequestConfig(targetUrl, settings);

        try {
            logger.debug(`⏳ [${domain}] Request (Proxy: ${settings.proxy.enabled ? 'ON' : 'OFF'})...`);
            const startTime = Date.now();

            const { data } = await axios.get(url, options);

            const duration = Date.now() - startTime;
            if (!Array.isArray(data)) return [];

            logger.info(`✅ [${domain}] Returned ${data.length} posts in ${duration}ms`);
            return data;

        } catch (error: any) {
            logger.error(`❌ [${domain}] Falha: ${error.message}`);
            return [];
        }
    }
}