import type { RequestHandler } from 'express';
import * as sseNotifications from '@server/services/sse/sseNotificationsService.js';
import * as sseOrderManagement from '@server/services/sse/sseOrderManagementService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';

export const handleSseNotificationsRequest: RequestHandler = (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Отправляет заголовки сразу после соединения
    res.write(':ping\n\n'); // 'Прогрев' соединения

    const userId = req.dbUser._id.toString();
    sseNotifications.addClient(userId, req, res);
};

export const handleSseOrderManagementRequest: RequestHandler = (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Отправляет заголовки сразу после соединения
    res.write(':ping\n\n'); // 'Прогрев' соединения

    const userId = req.dbUser._id.toString();
    sseOrderManagement.addClient(userId, req, res);
};
