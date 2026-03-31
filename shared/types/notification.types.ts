import type { TNotification } from './constants.types.js';

export interface INotification {
    id: string;
    status?: TNotification;
    recipients?: string[];
    subject: string;
    message: string;
    signature: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
    sentBy?: string;
    sentAt?: string | null;
    isRead?: boolean;
    readAt?: string | null;
}
