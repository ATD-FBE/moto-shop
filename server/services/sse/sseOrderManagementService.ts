import type { Request, Response } from 'express';
import type { IAdminSseMessageData } from '@shared/types/index.js';

const clients = new Map<string, Response>(); // userId -> response

export const addClient = (userId: string, req: Request, res: Response): void => {
    clients.set(userId, res);

    req.on('close', () => {
        clients.delete(userId);
    });
};

export const sendToAllClients = (data: IAdminSseMessageData): void => {
    clients.forEach((res, _userId) => { // Порядок параметров в forEach для Map => (value, key, map)
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
};
