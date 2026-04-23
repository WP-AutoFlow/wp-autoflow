import axios from 'axios';
import { logger } from '../utils/logger';

export class SpeedyIndexService {
    static async ping(urlToIndex: string, settings: any) {
        if (!settings.indexing?.speedyIndex?.enabled || !settings.indexing?.speedyIndex?.apiKey) return;

        try {
            logger.info(`⚡ SpeedyIndex: Enviando ${urlToIndex}...`);

            const payload = {
                url: urlToIndex,
                pay_per_indexed: settings.indexing.speedyIndex.payPerIndexed || false
            };

            await axios.post('https://api.speedyindex.com/v2/google/url', payload, {
                headers: {
                    'Authorization': settings.indexing.speedyIndex.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            logger.info(`✅ SpeedyIndex: Success for ${urlToIndex}`);
        } catch (error: any) {
            const apiMessage = error.response?.data?.error || error.message;
            logger.error(`❌ SpeedyIndex Error: ${apiMessage}`);
        }
    }
}