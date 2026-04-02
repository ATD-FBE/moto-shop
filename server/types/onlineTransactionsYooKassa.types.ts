import type { Payment, Refund } from '@a2seven/yoo-checkout';

export interface IYooKassaWebhook {
    type: 'notification';
    event: TYooKassaEvent;
    object: Payment | Refund;
}

export type TYooKassaExternalTx = Payment | Refund;

export interface IYooKassaListResponse<T> {
    type: 'list';
    items: T[];
    next_cursor?: string;
}

type TYooKassaEvent = 
    | 'payment.waiting_for_capture' 
    | 'payment.succeeded' 
    | 'payment.canceled' 
    | 'refund.succeeded';
