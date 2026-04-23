import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const userCount = await UserModel.countDocuments();

    if (userCount === 0) {
        if (req.path === '/api/setup' && req.method === 'POST') {
            return next();
        }
        return res.status(401).json({ error: 'SETUP_REQUIRED', message: 'Crie o usuário admin.' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};