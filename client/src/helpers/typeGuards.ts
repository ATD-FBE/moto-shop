import { DELIVERY_METHOD, PAYMENT_METHOD, REFUND_METHOD } from '@shared/constants.js';
import type { TFieldStateValue } from '@/types/index.js';
import type {
    IOrderStatusEntry,
    IOrderStatusEntrySummary,
    IFinancialsEventEntry,
    IFinancialsEventEntrySummary,
    TDeliveryMethod,
    TPaymentMethod,
    TRefundMethod
} from '@shared/types/index.js';

const DELIVERY_METHOD_SET = new Set<unknown>(Object.values(DELIVERY_METHOD));
const PAYMENT_METHOD_SET = new Set<unknown>(Object.values(PAYMENT_METHOD));
const REFUND_METHOD_SET = new Set<unknown>(Object.values(REFUND_METHOD));

export const isFullOrderStatusEntry = (
    entry: IOrderStatusEntry | IOrderStatusEntrySummary | undefined
): entry is IOrderStatusEntry => {
    return !!entry && 'changedBy' in entry && typeof entry.changedBy === 'object';
};

export const isFullOrderFinancialsEntry = (
    entry: IFinancialsEventEntry | IFinancialsEventEntrySummary | undefined
): entry is IFinancialsEventEntry => {
    return !!entry && 'eventId' in entry;
};

export const isEmptyableDeliveryMethod = (
    method: TFieldStateValue
): method is (TDeliveryMethod | '') => {
    return DELIVERY_METHOD_SET.has(method) || method === '';
};

export const isEmptyablePaymentMethod = (
    method: TFieldStateValue
): method is (TPaymentMethod | '') => {
    return PAYMENT_METHOD_SET.has(method) || method === '';
};

export const isEmptyableRefundMethod = (
    method: TFieldStateValue
): method is (TRefundMethod | '') => {
    return REFUND_METHOD_SET.has(method) || method === '';
};
