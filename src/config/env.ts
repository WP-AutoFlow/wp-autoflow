import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,

    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wp_autoflow',

    redis: {
        url: process.env.REDIS_URL,

        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};