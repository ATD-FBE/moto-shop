import type { Request, Response } from 'express';

const clients = new Map<string, Response>(); // userId -> response

export const addClient = (userId: string, req: Request, res: Response): void => {
    clients.set(userId, res);

    req.on('close', () => {
        clients.delete(userId);
    });
};

export const sendToAllClients = (data: Record<string, unknown>): void => {
    clients.forEach((res, userId) => { // Порядок параметров в forEach для Map => (value, key, map)
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
};
