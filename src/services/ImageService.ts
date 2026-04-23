import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import { WordpressService } from './WordpressService';
import { settingsService } from './SettingsService';
import { logger } from '../utils/logger';
import { buildRequestConfig } from '../utils/requestHelper';

export class ImageService {

    static extractImage(post: any): string | null {
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
            const media = post._embedded['wp:featuredmedia'][0];
            if (media.source_url) {
                return media.source_url;
            }
        }

        if (post.jetpack_featured_media_url) {
            return post.jetpack_featured_media_url;
        }

        const content = post.content?.rendered || '';
        
        const regexImg = /<img[^>]+src="([^">]+)"/g;
        let match2;
        while ((match2 = regexImg.exec(content)) !== null) {
            const url = match2[1];
            if (url.match(/\.(jpeg|jpg|png|avif|webp)$/i)) return url;
        }

        const regexLink = /<a[^>]+href="([^">]+)"/g;
        let match;
        while ((match = regexLink.exec(content)) !== null) {
            const url = match[1];
            if (url.match(/\.(jpeg|jpg|png|avif|webp)$/i)) return url;
        }
        
        return null;
    }

    static async processAndUploadImage(imageUrl: string): Promise<number> {
        try {
            const settings = await settingsService.getSettings();

            const reqImage = buildRequestConfig(imageUrl, settings);

            const response = await axios.get(reqImage.url, {
                ...reqImage.options,
                responseType: 'arraybuffer'
            });

            let buffer = Buffer.from(response.data);

            const filename = path.basename(imageUrl).split('?')[0]; 
            const isAvif = path.extname(filename).toLowerCase() === '.avif';
            const watermarkUrl = settings.images.watermarkUrl;

            if (watermarkUrl && !isAvif) {
                logger.debug('⚠️ Adding a watermark to the image');
                try {
                    const wmResponse = await axios.get(watermarkUrl, {
                        responseType: 'arraybuffer',
                        timeout: 5000
                    });
                    const wmBuffer = Buffer.from(wmResponse.data);

                    buffer = await sharp(buffer)
                        .composite([{ input: wmBuffer, gravity: 'south' }])
                        .toBuffer();

                } catch (e: any) {
                    logger.warn(`⚠️ Error in Watermark: ${e.message}`);
                }
            }

            return await WordpressService.uploadMedia(buffer, filename);
        } catch (error: any) {
            logger.error(`❌ Error in image: ${error.message}`);
            return 0;
        }
    }
}