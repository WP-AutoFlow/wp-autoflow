import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { SiteModel } from '../models/Site';
import { settingsService } from '../services/SettingsService';
import { scraperQueue, updateSystemCron } from '../lib/queue';
import axios from 'axios';
import { logger } from '../utils/logger';
import { TargetPostModel } from '../models/TargetPost';
import { SeoService } from '../services/SeoService';
import { SettingModel } from '../models/Setting';
import { PostModel } from '../models/Post';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme_please';

const auth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'TOKEN_REQUIRED' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};

router.get('/auth/status', async (req, res) => {
    const count = await UserModel.countDocuments();
    res.json({ needsSetup: count === 0 });
});

router.post('/auth/setup', async (req, res) => {
    const count = await UserModel.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'SETUP_ALREADY_DONE' });

    const { email, password } = req.body;
    await UserModel.create({ email, password });
    res.json({ success: true });
});

router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, name: user.name } });
});

router.get('/settings', auth, async (req, res) => {
    const settings = await settingsService.getSettings();
    res.json(settings);
});

router.put('/settings', auth, async (req, res) => {
    const settings = await settingsService.updateSettings(req.body);

    if (settings.cronSchedule) {
        await updateSystemCron(settings.cronSchedule);
    }

    res.json(settings);
});

router.get('/sites', auth, async (req, res) => {
    const sites = await SiteModel.find().sort({ createdAt: -1 });
    res.json(sites);
});

router.post('/sites', auth, async (req, res) => {
    try {
        const site = await SiteModel.create(req.body);
        res.json(site);
    } catch (e: any) {
        logger.error(`Erro ao criar site: ${e.message}`);
        res.status(400).json({ error: 'SITE_CREATION_ERROR' });
    }
});

router.put('/sites/:id', auth, async (req, res) => {
    const site = await SiteModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(site);
});

router.delete('/sites/:id', auth, async (req, res) => {
    await SiteModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

router.post('/sites/:id/run', auth, async (req, res) => {
    try {
        const site = await SiteModel.findById(req.params.id);

        if (!site) {
            return res.status(404).json({ error: 'SITE_NOT_FOUND' });
        }

        await scraperQueue.add('process-site', {
            ...site.toObject(),
            domain: site.domain
        }, {
            removeOnComplete: 100,
            removeOnFail: 100,
            attempts: 3
        });

        logger.info(`🚀 Disparo manual acionado para: ${site.domain}`);
        res.json({ success: true });

    } catch (error: any) {
        logger.error('Erro ao disparar site manual:', error);
        res.status(500).json({ error: 'JOB_DISPATCH_ERROR' });
    }
});

router.post('/actions/run-now', auth, async (req, res) => {
    await scraperQueue.add('dispatch-sites', { type: 'manual-trigger' });
    res.json({ success: true });
});

router.get('/seo/stats', auth, async (req, res) => {
    try {
        const count = await TargetPostModel.countDocuments();
        res.json({ count });
    } catch (e) {
        res.json({ count: 0 });
    }
});

router.post('/seo/sync', auth, async (req, res) => {
    SeoService.syncPosts();
    res.json({ success: true });
});

router.post('/wp-test-connection', auth, async (req, res) => {
    const { api: wpApi, user, password } = req.body;

    if (!wpApi || !user || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    try {
        const baseUrl = wpApi.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/wp-json/wp/v2/users/me`;

        const token = Buffer.from(`${user}:${password}`).toString('base64');

        const response = await axios.get(targetUrl, {
            headers: {
                'Authorization': `Basic ${token}`,
                'User-Agent': 'WP AutoFlow Bot'
            },
            timeout: 10000
        });

        res.json({ success: true, name: response.data.name });

    } catch (error: any) {
        logger.warn(`Falha no teste de conexão WP: ${error.message}`);

        let errorCode = 'WP_CONNECTION_ERROR';
        let httpStatus = 502;

        if (error.response?.status === 401 || error.response?.status === 403) {
            errorCode = 'INVALID_CREDENTIALS';
            httpStatus = 400;
        }

        else if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
            errorCode = 'SITE_NOT_FOUND';
            httpStatus = 404;
        }

        res.status(httpStatus).json({ error: errorCode });
    }
});

router.get('/wp-categories', auth, async (req, res) => {
    try {
        const settings = await settingsService.getSettings();

        if (!settings.wp.api) {
            return res.status(412).json({ error: 'WP_API_NOT_CONFIGURED' });
        }

        const baseUrl = settings.wp.api.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/wp-json/wp/v2/categories?per_page=100&hide_empty=0`;

        const config: any = {};

        if (settings.wp.user && settings.wp.password) {
            const token = Buffer.from(`${settings.wp.user}:${settings.wp.password}`).toString('base64');
            config.headers = { 'Authorization': `Basic ${token}` };
        }

        const response = await axios.get(targetUrl, config);

        const categories = response.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name
        }));

        res.json(categories);

    } catch (error: any) {
        console.error('Erro ao buscar categorias WP:', error.message);
        res.status(502).json({ error: 'WP_CONNECTION_ERROR' });
    }
});

router.delete('/system/clear-history', auth, async (req, res) => {
    try {
        const p = await PostModel.deleteMany({});
        const t = await TargetPostModel.deleteMany({});

        logger.warn(`🧹 System: User cleared history. Posts: ${p.deletedCount}, SEO: ${t.deletedCount}`);

        res.json({
            success: true,
            message: `Clean record! ${p.deletedCount} posts removed.`
        });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing history.' });
    }
});

router.post('/system/factory-reset', auth, async (req, res) => {
    try {
        await SiteModel.deleteMany({});
        await PostModel.deleteMany({});
        await TargetPostModel.deleteMany({});

        const defaultSettings = {
            isConfigured: false,
            cronSchedule: '0 */1 * * *',
            runOnStartup: false,
            execution: { mode: 'sequential', concurrency: 1, staggerDelay: 5000 },
            wp: { api: '', user: '', password: '' },
            ai: { enabled: false, rewriteContent: false, language: 'pt', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5-mini', apiKey: '' },
            proxy: { enabled: false },
            images: { uploadEnabled: false },
            integrations: { 
                webhook: { enabled: false, url: '' } 
            },
            indexing: {
                indexNow: { enabled: false, apiKey: '' },
                speedyIndex: { enabled: false, apiKey: '', payPerIndexed: false }
            },
            seo: { linkBuildingEnabled: false }
        };

        await SettingModel.findOneAndUpdate({}, defaultSettings, { upsert: true });

        logger.warn('💥 FACTORY RESET EXECUTED BY USER');

        res.json({ success: true, message: 'System reset to factory settings.' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Critical error while resetting the system.' });
    }
});

router.get('/queue/stats', auth, async (req, res) => {
    try {
        const counts = await scraperQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed');
        res.json(counts);
    } catch (e) {
        res.status(500).json({ error: 'QUEUE_ERROR' });
    }
});

router.get('/queue/jobs/:status', auth, async (req, res) => {
    try {
        const status = req.params.status as any;

        const jobs = await scraperQueue.getJobs([status], 0, 19, true);
        res.json(jobs);
    } catch (e) {
        res.status(500).json({ error: 'QUEUE_ERROR' });
    }
});

router.post('/queue/retry/:id', auth, async (req, res) => {
    try {
        const job = await scraperQueue.getJob(req.params.id);
        if (job) {
            await job.retry();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'JOB_NOT_FOUND' });
        }
    } catch (e) {
        res.status(500).json({ error: 'RETRY_ERROR' });
    }
});

router.post('/queue/clean/:status', auth, async (req, res) => {
    try {
        await scraperQueue.clean(0, 0, req.params.status as any);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'CLEAN_ERROR' });
    }
});

router.get('/system/export', auth, async (req, res) => {
    try {
        const settings = await SettingModel.findOne().lean();
        const sites = await SiteModel.find().lean();

        if (settings) {
            delete (settings as any)._id;
            delete (settings as any).__v;
        }

        const cleanSites = sites.map((site: any) => {
            delete site._id;
            delete site.__v;
            return site;
        });

        const backupData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            settings: settings || {},
            sites: cleanSites
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="wp-autoflow-backup.json"');

        res.send(JSON.stringify(backupData, null, 2));
    } catch (error: any) {
        logger.error(`Export Error: ${error.message}`);
        res.status(500).json({ error: 'EXPORT_FAILED' });
    }
});

router.post('/system/import', auth, async (req, res) => {
    try {
        const { settings, sites } = req.body;

        if (!settings && !sites) {
            return res.status(400).json({ error: 'INVALID_JSON_FORMAT' });
        }

        if (settings && Object.keys(settings).length > 0) {
            await SettingModel.findOneAndUpdate({}, settings, { upsert: true });

            if (settings.cronSchedule) {
                await updateSystemCron(settings.cronSchedule);
            }
        }

        if (sites && Array.isArray(sites) && sites.length > 0) {
            for (const site of sites) {
                await SiteModel.findOneAndUpdate(
                    { domain: site.domain },
                    site,
                    { upsert: true, new: true }
                );
            }
        }

        logger.info('📦 System data imported successfully.');
        res.json({ success: true, message: 'System data imported successfully!' });

    } catch (error: any) {
        logger.error(`Import Error: ${error.message}`);
        res.status(500).json({ error: 'IMPORT_FAILED' });
    }
});

export default router;