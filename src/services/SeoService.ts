import axios from 'axios';
import { TargetPostModel } from '../models/TargetPost';
import { settingsService } from './SettingsService';
import { logger } from '../utils/logger';

export class SeoService {

    static async syncPosts() {
        const settings = await settingsService.getSettings();
        if (!settings.wp.api) return;

        logger.info('SEO: Sync started...');

        try {
            const baseUrl = settings.wp.api.replace(/\/$/, '');
            const url = `${baseUrl}/wp-json/wp/v2/posts?per_page=100&_fields=id,title,link,slug`;

            const config: any = {};
            if (settings.wp.user && settings.wp.password) {
                const token = Buffer.from(`${settings.wp.user}:${settings.wp.password}`).toString('base64');
                config.headers = { 'Authorization': `Basic ${token}` };
            }

            const { data } = await axios.get(url, config);

            for (const post of data) {
                await TargetPostModel.findOneAndUpdate(
                    { wpId: post.id },
                    {
                        wpId: post.id,
                        title: post.title.rendered,
                        link: post.link,
                        slug: post.slug
                    },
                    { upsert: true }
                );
            }
            logger.info(`SEO: Sync completed. ${data.length} posts processed.`);
        } catch (error: any) {
            logger.error(`SEO Sync Error: ${error.message}`);
        }
    }

    static async findRelevantLinks(newPostTitle: string): Promise<any[]> {
        const keywords = newPostTitle.split(' ')
            .filter(w => w.length > 3)
            .join(' ');

        const candidates = await TargetPostModel.find(
            { $text: { $search: keywords } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(5);

        return candidates.map(c => ({ title: c.title, link: c.link }));
    }
}