import { Queue, Worker, Job } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Express } from 'express';
import { config } from '../config/env';
import { ScraperService } from '../services/ScraperService';
import { ProcessorService } from '../services/ProcessorService';
import { logger } from '../utils/logger';
import { settingsService } from '../services/SettingsService';
import { SiteModel } from '../models/Site';

const queueName = 'scraper-queue';

export const scraperQueue = new Queue(queueName, { connection: config.redis });

export let worker: Worker | null = null;

export const updateSystemCron = async (cronSchedule: string) => {
    logger.info('🔄 Updating routine schedule...');

    const jobs = await scraperQueue.getRepeatableJobs();
    for (const job of jobs) {
        await scraperQueue.removeRepeatableByKey(job.key);
    }

    if (cronSchedule && cronSchedule !== 'custom') {
        await scraperQueue.add('dispatch-sites', { type: 'cron-trigger' }, {
            repeat: { pattern: cronSchedule },
            jobId: 'system-cron-job'
        });
        logger.info(`📅 CRON Registered successfully: ${cronSchedule}`);
    } else {
        logger.info('📅 CRON disabled (custom/manual mode).');
    }
};

export const startQueueSystem = async (app: Express) => {
    logger.info('🔌 Connecting to Database to fetch configuration...');

    const settings = await settingsService.getSettings();

    const execMode = settings.execution?.mode || 'sequential';
    let concurrency = settings.execution?.concurrency || 1;

    if (execMode === 'sequential') {
        concurrency = 1;
    }

    logger.info(`⚙️ Queue Configuration Loaded: Mode=${execMode} | Concurrency=${concurrency}`);

    worker = new Worker(queueName, async (job: Job) => {
        const processor = new ProcessorService();
        const currentSettings = await settingsService.getSettings();

        if (job.name === 'dispatch-sites') {
            const activeSites = await SiteModel.find({ enabled: true });

            if (activeSites.length === 0) {
                logger.warn('⚠️ Maestro: No active sites found to process.');
                return { dispatched: 0 };
            }

            const currentMode = currentSettings.execution?.mode || 'sequential';
            const staggerDelay = currentSettings.execution?.staggerDelay || 5000;

            logger.info(`📢 Maestro: Dispatching ${activeSites.length} sites. Mode: ${currentMode}`);

            const jobsToDispatch = activeSites.map((site: any, index: number) => {
                let delay = 0;
                if (currentMode === 'staggered') {
                    delay = index * staggerDelay;
                }

                return {
                    name: 'process-site',
                    data: { ...site.toObject(), domain: site.domain },
                    opts: {
                        delay,
                        removeOnComplete: 100,
                        removeOnFail: 100
                    }
                };
            });

            await scraperQueue.addBulk(jobsToDispatch);
            return { dispatched: jobsToDispatch.length };
        }

        if (job.name === 'process-site') {
            logger.info(`⚡ Processing: ${job.data.domain} (Job ID: ${job.id})`);

            try {
                const posts = await ScraperService.fetchPosts(job.data.domain);

                if (!posts || posts.length === 0) {
                    logger.info(`💤 [${job.data.domain}] No new posts.`);
                    return { processed: 0, status: 'no_posts' };
                }

                let processedCount = 0;
                for (const post of posts) {
                    const success = await processor.processPost(post, job.data);
                    if (success) processedCount++;
                }

                logger.info(`🏁 [${job.data.domain}] Finished. New posts: ${processedCount}`);
                return { domain: job.data.domain, newPosts: processedCount };

            } catch (error: any) {
                logger.error(`💥 Fatal error in ${job.data.domain}: ${error.message}`);
                throw error;
            }
        }

    }, {
        connection: config.redis,
        concurrency: concurrency,
        lockDuration: 60000,
        lockRenewTime: 30000,
    });

    worker.on('failed', (job, err) => {
        logger.error(`❌ Job ${job?.id} failed: ${err.message}`);
    });
    worker.on('error', (err) => {
        logger.error(`❌ Worker internal error: ${err.message}`);
    });

    logger.info('🔄 Initializing Scheduler...');

    const cronSchedule = settings.cronSchedule || '0 */1 * * *';
    await updateSystemCron(cronSchedule);

    if (settings.runOnStartup) {
        logger.info('🚀 RUN_ON_STARTUP active in DB: Triggering now!');
        await scraperQueue.add('dispatch-sites', { type: 'boot-trigger' });
    }

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({
        queues: [new BullMQAdapter(scraperQueue)],
        serverAdapter,
    });
    app.use('/admin/queues', serverAdapter.getRouter());

    logger.info('✅ Queue System fully operational via Database.');
};