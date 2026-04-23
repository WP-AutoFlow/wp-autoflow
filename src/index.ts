import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { startQueueSystem } from './lib/queue';
import { logger } from './utils/logger';
import apiRoutes from './routes/api';
import { settingsService } from './services/SettingsService';

const app = express();

app.use(cors());
app.use(express.json());

const start = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        logger.info('📦 MongoDB Connected');

        const settings = await settingsService.getSettings();

        if (settings.proxy.enabled) {
            if (settings.proxy.scrapeDoToken) {
                logger.info('🛡️ Proxy Active: API Mode (Scrape.do)');
            } else if (settings.proxy.url) {
                logger.info('🛡️ Proxy Active: Tunnel Mode (Standard Proxy)');
            } else {
                logger.warn('⚠️ INVALID CONFIG: Proxy enabled in settings but missing credentials!');
            }
        } else {
            logger.info('🌍 Proxy Disabled: Direct connection');
        }

        if (settings.images.uploadEnabled) {
            const wmStatus = settings.images.watermarkUrl ? `Enabled` : 'Disabled';
            logger.info(`🖼️  Images: Upload ON | Watermark: ${wmStatus}`);
        } else {
            logger.info(`🖼️  Images: Upload OFF Globally`);
        }

        await startQueueSystem(app);

        app.use('/api', apiRoutes);

        const clientDistPath = path.resolve(__dirname, '../client/dist');

        app.use(express.static(clientDistPath));

        app.get('*', (req, res) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/admin/queues')) {
                return res.status(404).json({ error: 'Not Found' });
            }
            res.sendFile(path.join(clientDistPath, 'index.html'));
        });

        app.listen(config.port, () => {
            logger.info(`🚀 Server running on port ${config.port}`);
            logger.info(`📊 Admin Panel: http://localhost:${config.port}`);
        });

    } catch (error) {
        logger.error('Fatal Error:', error);
        process.exit(1);
    }
};

start();