import type { Request, Response, NextFunction } from 'express';
import * as sseNotifications from '@server/services/sse/sseNotificationsService.js';
import * as sseOrderManagement from '@server/services/sse/sseOrderManagementService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';

export const handleSseNotificationsRequest = (req: Request, res: Response, next: NextFunction): void => {
    if (!requireDbUser(req, next)) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Отправляет заголовки сразу после соединения
    res.write(':ping\n\n'); // 'Прогрев' соединения

    const userId = req.dbUser._id.toString();
    sseNotifications.addClient(userId, req, res);
};

export const handleSseOrderManagementRequest = (req: Request, res: Response, next: NextFunction): void => {
    if (!requireDbUser(req, next)) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Отправляет заголовки сразу после соединения
    res.write(':ping\n\n'); // 'Прогрев' соединения

    const userId = req.dbUser._id.toString();
    sseOrderManagement.addClient(userId, req, res);
};
