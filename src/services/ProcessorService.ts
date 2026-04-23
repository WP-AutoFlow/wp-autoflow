import { PostModel } from '../models/Post';
import { ImageService } from './ImageService';
import { AiService } from './AiService';
import { WordpressService } from './WordpressService';
import { logger } from '../utils/logger';
import { settingsService } from './SettingsService';
import { WebhookService } from './WebhookService';
import { IndexNowService } from './IndexNowService';
import { SeoService } from './SeoService';
import { SpeedyIndexService } from './SpeedyIndexService';

export class ProcessorService {

    async processPost(post: any, siteConfig: any): Promise<boolean> {
        if (!post.content?.rendered) {
            logger.warn(`[${siteConfig.domain}] Post ${post.id} with no content. Skipping.`);
            return false;
        }

        const sourceDomain = siteConfig.domain.replace(/(^\w+:|^)\/\//, '').split('/')[0];

        const exists = await PostModel.findOne({ postId: post.id, source: sourceDomain });
        if (exists) {
            logger.debug(`⏩ [${sourceDomain}] Post "${post.title.rendered.substring(0, 30)}..." it already exists.`);
            return false;
        }

        logger.info(`Processing: "${post.title.rendered}"`);

        const settings = await settingsService.getSettings();

        let featuredMediaId = 0;
        if (settings.images.uploadEnabled) {
            try {
                const imageUrl = ImageService.extractImage(post);

                if (imageUrl) {
                    logger.debug(`🖼️ Image found: ${imageUrl.substring(0, 40)}...`);
                    featuredMediaId = await ImageService.processAndUploadImage(imageUrl);
                } else {
                    logger.debug(`🤷‍♂️ Post with no detectable image.`);
                }
            } catch (e: any) {
                logger.error(`❌ Image processing error: ${e.message}`);
            }
        } else {
            logger.debug(`🚫 Image upload is DISABLED in settings.`);
        }

        let title = post.title.rendered.replace(/^"|"$/g, '');
        let content = post.content.rendered;
        const titleOriginal = title;
        const contentOriginal = content;

        let suggestedLinks: any[] = [];
        if (settings.seo?.linkBuildingEnabled) {
            try {
                suggestedLinks = await SeoService.findRelevantLinks(title);
            } catch (e) {
                logger.warn('SEO Link search failed');
            }
        }

        try {
            title = await AiService.rewriteTitle(title);
            if (title !== titleOriginal) {
                logger.info(`🤖 Title rewritten by AI.`);
            }
        } catch (error) {
            logger.error('Title rewrite failed');
        }

        try {
            const contentOriginalLength = content.length;
            content = await AiService.rewriteContent(content, suggestedLinks);

            if (content.length !== contentOriginalLength) {
                logger.info(`🤖 Content rewritten by AI.`);
            }
        } catch (error) {
            logger.error('Failed to rewrite content (using original):', error);
        }

        console.log(`📤 Sending to the destination WordPress...`);

        const wpResult = await WordpressService.createPost({
            title,
            content,
            categories: [siteConfig.categoryId || 1],
            featured_media: featuredMediaId,
            date: post.date,
            status: 'publish'
        });

        if (!wpResult || !wpResult.id) {
            logger.error(`❌ Failed to create post in WordPress.`);
            return false;
        }

        let finalLink = wpResult.link;

        if (!finalLink) {
            const baseUrl = settings.wp.api.split('/wp-json')[0];
            finalLink = `${baseUrl}/?p=${wpResult.id}`;
        }

        await IndexNowService.ping(finalLink, settings);
        await SpeedyIndexService.ping(finalLink, settings);

        await WebhookService.dispatch({
            id: wpResult.id,
            title: title,
            link: finalLink
        }, settings);

        await PostModel.create({
            site: siteConfig._id,
            postId: post.id,
            postIdInternal: wpResult.id,
            slug: post.slug,
            source: sourceDomain,
            link: post.link,
            originalTitle: titleOriginal,
            generateTitle: title,
            originalContent: contentOriginal,
            generateContent: content
        });

        logger.info(`Success: ID ${wpResult.id}`);

        return true;
    }
}