import { HttpsProxyAgent } from 'https-proxy-agent';
import { logger } from './logger';

interface RequestConfig {
    url: string;
    options: any;
}

export const buildRequestConfig = (originalUrl: string, settings: any): RequestConfig => {

    const options: any = {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        proxy: false,
        httpsAgent: undefined
    };

    if (!settings.proxy.enabled) {
        return { url: originalUrl, options };
    }

    let finalUrl = originalUrl;

    if (settings.proxy.scrapeDoToken) {
        const encodedUrl = encodeURIComponent(originalUrl);
        finalUrl = `http://api.scrape.do?token=${settings.proxy.scrapeDoToken}&geoCode=br&url=${encodedUrl}`;
    }

    else if (settings.proxy.url) {
        try {
            const agent = new HttpsProxyAgent(settings.proxy.url);
            options.httpsAgent = agent;
        } catch (error) {
            logger.error(`❌ Erro config Proxy: ${settings.proxy.url}`);
        }
    }

    else {
        logger.warn(`⚠️ Proxy enabled=true mas sem credenciais.`);
    }

    return { url: finalUrl, options };
};