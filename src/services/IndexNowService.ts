import axios from 'axios';
import { logger } from '../utils/logger';

export class IndexNowService {
    static async ping(urlToIndex: string, settings: any) {
        if (!settings.indexing?.indexNow?.enabled || !settings.indexing?.indexNow?.apiKey) return;

        try {
            const urlObj = new URL(urlToIndex);
            const host = urlObj.hostname;

            logger.info(`🔍 IndexNow: Ping ${host}...`);

            await axios.post('https://api.indexnow.org/indexnow', {
                host: host,
                key: settings.indexing.indexNow.apiKey,
                keyLocation: `https://${host}/${settings.indexing.indexNow.apiKey}.txt`,
                urlList: [urlToIndex]
            });

            logger.info(`✅ IndexNow: Success for ${urlToIndex}`);
        } catch (error: any) {
            logger.error(`❌ IndexNow Error: ${error.message}`);
        }
    }
}