import axios from 'axios';
import { settingsService } from './SettingsService';
import { logger } from '../utils/logger';

export class WordpressService {
    private static getAuthHeader(settings: any) {
        if (!settings.wp.user || !settings.wp.password) return {};

        const token = Buffer.from(`${settings.wp.user}:${settings.wp.password}`).toString('base64');
        return { 'Authorization': `Basic ${token}` };
    }

    static async uploadMedia(buffer: Buffer, filename: string): Promise<number> {
        const settings = await settingsService.getSettings();

        if (!settings.wp.api) return 0;

        try {
            const apiUrl = settings.wp.api.replace(/\/$/, '');

            const response = await axios.post(`${apiUrl}/wp-json/wp/v2/media`, buffer, {
                headers: {
                    ...this.getAuthHeader(settings),
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Content-Type': 'image/jpeg'
                }
            });
            return response.data.id;
        } catch (e: any) {
            logger.error(`Erro upload WP: ${e.response?.data?.message || e.message}`);
            return 0;
        }
    }

    static async createPost(postData: any): Promise<{ id: number, link: string } | null> {
        const settings = await settingsService.getSettings();

        if (!settings.wp.api) {
            logger.error('API do WordPress não configurada no Painel.');
            return null;
        }

        try {
            const apiUrl = settings.wp.api.replace(/\/$/, '');

            const response = await axios.post(`${apiUrl}/wp-json/wp/v2/posts`, postData, {
                headers: {
                    ...this.getAuthHeader(settings),
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 201) {
                return {
                    id: response.data.id,
                    link: response.data.link
                };
            }
            return null;
        } catch (e: any) {
            logger.error(`Erro create post WP: ${e.response?.data?.message || e.message}`);
            return null;
        }
    }
}