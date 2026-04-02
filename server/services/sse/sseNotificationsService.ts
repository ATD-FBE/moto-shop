import type { Request, Response } from 'express';
import type { Types } from 'mongoose';

const clients = new Map<string, Response>(); // userId -> response

export const addClient = (userId: string, req: Request, res: Response): void => {
    clients.set(userId, res);

    req.on('close', () => {
        clients.delete(userId);
    });
};

export const sendToClients = (userObjectIds: Types.ObjectId[], data: Record<string, unknown>): void => {
    userObjectIds.forEach(userObjectId => {
        const res = clients.get(userObjectId.toString());
        res?.write(`data: ${JSON.stringify(data)}\n\n`);
    });
};
