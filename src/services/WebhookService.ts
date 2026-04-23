import axios from 'axios';
import { logger } from '../utils/logger';

export class WebhookService {
    static async dispatch(data: { title: string, link: string, id: number }, settings: any) {
        if (!settings?.integrations?.webhook?.enabled || !settings?.integrations?.webhook?.url) return;

        logger.info(`📢 Webhook: Triggering event...`);

        try {
            await axios.post(settings?.integrations?.webhook?.url, {
                event: 'post_created',
                data: {
                    id: data.id,
                    title: data.title,
                    link: data.link,
                    timestamp: new Date().toISOString()
                },
                source: 'WP AutoFlow'
            });
            logger.info(`✅ Webhook: Sent successfully.`);
        } catch (error: any) {
            logger.error(`❌ Webhook Error: ${error.message}`);
        }
    }
}