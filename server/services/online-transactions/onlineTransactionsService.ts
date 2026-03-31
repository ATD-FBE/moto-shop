import {
    createYooKassaPayment,
    createYooKassaRefunds,
    verifyYooKassaWebhookAuthenticity,
    normalizeYooKassaWebhook,
    fetchYooKassaExternalTransactions,
    normalizeYooKassaExternalTransaction
} from './providers/yookassa.provider.js';
import log from '@server/utils/logger.js';
import { CARD_ONLINE_PROVIDER } from '@shared/constants.js';
import type { Request, Response, NextFunction } from 'express';
import type {
    ICardOnlineProviderMap,
    ICreateOnlinePaymentParams,
    ICreateOnlinePaymentResult,
    ICreateOnlineRefundsParams,
    ICreateOnlineRefundsResult,
} from '@server/types/index.js';
import type { TCardOnlineProvider, IRefundablePayment } from '@shared/types/index.js';

export const detectWebhookProvider = (req: Request): TCardOnlineProvider | null => {
    const headers = req.headers;
    const userAgent = headers['user-agent'] || '';

    // ЮKassa
    if (headers['signature'] || headers['x-request-signature'] || userAgent.includes('AHC')) {
        return CARD_ONLINE_PROVIDER.YOOKASSA;
    }

    log.warn(`${req.reqCtx} - Провайдер вебхука не определён:`, { headers: req.headers, body: req.body });
    return null;
};

const providerMap: Record<TCardOnlineProvider, ICardOnlineProviderMap> = {
    [CARD_ONLINE_PROVIDER.YOOKASSA]: {
        createPayment: createYooKassaPayment,
        createRefund: createYooKassaRefunds,
        verifyWebhook: verifyYooKassaWebhookAuthenticity,
        normalizeWebhook: normalizeYooKassaWebhook,
        fetchExternal: fetchYooKassaExternalTransactions,
        normalizeExternal: normalizeYooKassaExternalTransaction
    }
} as const;

const getProvider = (provider: TCardOnlineProvider): ICardOnlineProviderMap | null =>
    providerMap[provider] ?? null;

export const createOnlinePayment = async (
    provider: TCardOnlineProvider,
    params: ICreateOnlinePaymentParams
): Promise<ICreateOnlinePaymentResult> => {
    const p = getProvider(provider);

    if (!p?.createPayment) {
        return {
            paymentId: null,
            confirmationUrl: null,
            error: new Error(`Провайдер ${provider} не поддерживает онлайн-оплаты`)
        };
    }

    return await p.createPayment(params);
};

export const createOnlineRefunds = async (
    provider: TCardOnlineProvider,
    refundTasks: IRefundablePayment[],
    params: ICreateOnlineRefundsParams
): Promise<ICreateOnlineRefundsResult> => {
    const p = getProvider(provider);

    if (!p?.createRefund) {
        return {
            refundIds: [],
            errors: refundTasks.map(task => ({
                task,
                error: new Error(`Провайдер ${provider} не поддерживает онлайн-возвраты`)
            }))
        };
    }

    return await p.createRefund(refundTasks, params);
};

export const verifyWebhookAuthenticity = (provider, req) => {
    const p = getProvider(provider);
    if (!p?.verifyWebhook) return false;

    return p.verifyWebhook(req);
};

export const normalizeWebhook = (provider, payload) => {
    const p = getProvider(provider);
    if (!p?.normalizeWebhook) return null;

    return p.normalizeWebhook(payload);
};

export const fetchExternalTransactions = async (provider, stuckDbOrders) => {
    const p = getProvider(provider);
    if (!p?.fetchExternal) return [];

    return await p.fetchExternal(stuckDbOrders);
};

export const normalizeExternalTransaction = (provider, tx) => {
    const p = getProvider(provider);
    if (!p?.normalizeExternal) return null;

    return p.normalizeExternal(tx);
};
