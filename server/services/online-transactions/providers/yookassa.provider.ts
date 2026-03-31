import { randomUUID } from 'crypto';
import { YooCheckout, ICreatePayment, ICreateRefund } from '@a2seven/yoo-checkout';
import ipRangeCheck from 'ip-range-check';
import config from '@server/config/config.js';
import { typeCheck } from '@server/utils/typeValidation.js';
import log from '@server/utils/logger.js';
import { toError } from '@shared/commonHelpers.js';
import { TRANSACTION_TYPE, CARD_ONLINE_PROVIDER } from '@shared/constants.js';
import type { Request, Response, NextFunction } from 'express';
import type {
    TDbOrderFinancialsEventEntry,
    ICreateOnlinePaymentParams,
    ICreateOnlinePaymentResult,
    ICreateOnlineRefundsParams,
    ICreateOnlineRefundsResult,
    ICreateOnlineRefundsResultError,
} from '@server/types/index.js';
import type { IRefundablePayment } from '@shared/types/index.js';

const yooKassaCheckout = new YooCheckout({
    shopId: config.yooKassa.shopId,
    secretKey: config.yooKassa.secretKey
});

const YOOKASSA_WEBHOOK_IPS = [
    '185.71.76.0/27',
    '185.71.77.0/27',
    '77.75.153.0/25',
    '77.75.156.11',
    '77.75.156.35',
    '77.75.154.128/25',
    '2a02:5180::/32'
];

const checkYooKassaIp = (req: Request): boolean => {
    const incomingIp =
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        '';

    let cleanIp = (Array.isArray(incomingIp) ? incomingIp[0] : incomingIp.split(',')[0]).trim();

    // Удаление ::ffff: из IP, IPv6 не затрагивается (не имеет точек)
    if (cleanIp.startsWith('::ffff:') && cleanIp.includes('.')) {
        cleanIp = cleanIp.substring(7);
    }

    return ipRangeCheck(cleanIp, YOOKASSA_WEBHOOK_IPS);
};

export const verifyYooKassaWebhookAuthenticity = (req: Request): boolean => {
    const isIpValid = checkYooKassaIp(req);
    if (!isIpValid) log.warn(`${req.reqCtx} - YooKassa webhook: IP вне белого списка`);
    return isIpValid; 
};

export const createYooKassaPayment = async (
    params: ICreateOnlinePaymentParams
): Promise<ICreateOnlinePaymentResult> => {
    const {
        paymentToken,
        amount,
        currency,
        returnUrl,
        description,
        orderId,
        orderNumber,
        customerId,
        provider
    } = params;

    const payload: ICreatePayment = {
        payment_token: paymentToken,
        amount: {
            value: amount.toFixed(2),
            currency: currency.toUpperCase() // Обязательно заглавные буквы валюты
        },
        confirmation: {
            type: 'redirect',
            return_url: returnUrl
        },
        description,
        metadata: {
            orderId,
            orderNumber,
            customerId,
            provider,
            amount
        },
        capture: true
    };

    const idempotenceKey = `payment-${randomUUID()}`;

    try {
        const payment = await yooKassaCheckout.createPayment(payload, idempotenceKey);

        return {
            paymentId: payment.id,
            confirmationUrl: payment.confirmation?.confirmation_url || null,
            error: null
        };
    } catch (err) {
        return {
            paymentId: null,
            confirmationUrl: null,
            error: toError(err)
        };
    }
};

export const createYooKassaRefunds = async (
    refundTasks: IRefundablePayment[],
    params: ICreateOnlineRefundsParams
): Promise<ICreateOnlineRefundsResult> => {
    const { currency, description } = params;

    const refundPromises = refundTasks.map(async (task) => {
        const originalPaymentId = task.transactionId;
        const amount = task.amount;

        const payload: ICreateRefund = {
            payment_id: originalPaymentId,
            amount: {
                value: amount.toFixed(2),
                currency: currency.toUpperCase() // Обязательно заглавные буквы валюты
            },
            description
        };

        const refund = await yooKassaCheckout.createRefund(payload);
        return refund.id;
    });

    const refundSettled = await Promise.allSettled(refundPromises);

    // Сбор ID успешно созданных транзакций возвратов и ошибок
    const refundIds: string[] = [];
    const errors: ICreateOnlineRefundsResultError[] = [];

    refundSettled.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
            refundIds.push(r.value);
        } else {
            errors.push({
                task: refundTasks[idx],
                error: toError(r.reason)
            });
        }
    });

    return { refundIds, errors };
};

export const normalizeYooKassaWebhook = (payload) => {
    const { type, event, object: webhookObj } = payload ?? {};

    if (type !== 'notification' || !typeCheck.string(event) || !typeCheck.object(webhookObj)) {
        return null;
    }

    const isPayment = event.startsWith('payment.');
    const isRefund = event.startsWith('refund.');
    if (!isPayment && !isRefund) return null;

    const cancellationDetails = webhookObj.cancellation_details;

    return {
        provider: CARD_ONLINE_PROVIDER.YOOKASSA,
        transactionType: isPayment ? TRANSACTION_TYPE.PAYMENT : TRANSACTION_TYPE.REFUND,
        transactionId: webhookObj.id,
        originalPaymentId: isRefund ? webhookObj.payment_id : undefined,
        amount: Number(webhookObj.amount?.value),
        markAsFailed: event.endsWith('.canceled'),
        ...(cancellationDetails && {
            failureReason: `${cancellationDetails.party}: ${cancellationDetails.reason}`
        }),
        createdAt: new Date(webhookObj.created_at),
        orderId: webhookObj.metadata?.orderId,
        rawEventType: event,
        rawPayload: payload
    };
};

export const fetchYooKassaExternalTransactions = async (stuckDbOrders) => {
    // Поиск минимальной даты создания записи транзакции для временного окна поиска
    const minStartedAt = stuckDbOrders.reduce((minDate, order) => {
        const startedAt = new Date(order.financials.currentOnlineTransaction.startedAt);
        return startedAt < minDate ? startedAt : minDate;
    }, new Date(Date.now()));
    
    // Добавление небольшого люфта (1 минуту) назад на случай задержек записи в БД
    const searchStartTimeISO = new Date(minStartedAt.getTime() - 60 * 1000).toISOString();

    // Флаги наличия оплат и/или возвратов
    const hasPendingPayments = stuckDbOrders.some(
        ord => ord.financials.currentOnlineTransaction.type === TRANSACTION_TYPE.PAYMENT
    );
    const hasPendingRefunds = stuckDbOrders.some(
        ord => ord.financials.currentOnlineTransaction.type === TRANSACTION_TYPE.REFUND
    );

    // Параметры запроса списков в YooKassa по умолчанию
    const yooKassaParams = { 'created_at_gte': searchStartTimeISO, limit: 100 };
    
    // Получение списков оплат и возвратов от YooKassa с использование пагинации по курсору
    let allExternalTransactions = [];
    let paymentsNextCursor = null;
    let refundsNextCursor = null;
    let isFetchingPayments = hasPendingPayments;
    let isFetchingRefunds = hasPendingRefunds;

    do {
        // Параллельные запросы оплат и возвратов в YooKassa
        const [paymentsResponse, refundsResponse] = await Promise.all([
            isFetchingPayments 
                ? yooKassaCheckout.getPaymentList({
                    ...yooKassaParams,
                    ...(paymentsNextCursor && { cursor: paymentsNextCursor })
                }) 
                : Promise.resolve({ items: [] }),
            isFetchingRefunds 
                ? yooKassaCheckout.getRefundList({
                    ...yooKassaParams,
                    ...(refundsNextCursor && { cursor: refundsNextCursor })
                }) 
                : Promise.resolve({ items: [] })
        ]);
        
        // Заполнение массива транзакций
        paymentsResponse.items?.forEach(tx => {
            tx.transactionType = TRANSACTION_TYPE.PAYMENT;
            allExternalTransactions.push(tx);
        });
        refundsResponse.items?.forEach(tx => {
            tx.transactionType = TRANSACTION_TYPE.REFUND;
            allExternalTransactions.push(tx);
        });
        
        // ЮKassa возвращает cursor, если записей больше, чем limit
        paymentsNextCursor = paymentsResponse.next_cursor;
        refundsNextCursor = refundsResponse.next_cursor;

        // Обновление флагов запросов оплат и возвратов в зависимости от наличия курсора
        isFetchingPayments = !!paymentsNextCursor;
        isFetchingRefunds = !!refundsNextCursor;
    } while (isFetchingPayments || isFetchingRefunds);

    return allExternalTransactions;
};

export const normalizeYooKassaExternalTransaction = (tx) => ({
    provider: CARD_ONLINE_PROVIDER.YOOKASSA,
    transactionType: tx.transactionType, // Получено в fetchYooKassaExternalTransactions
    transactionId: tx.id,
    originalPaymentId: tx.payment_id, // Для возврата
    amount: Number(tx.amount?.value),
    finished: ['succeeded', 'canceled'].includes(tx.status),
    markAsFailed: tx.status === 'canceled',
    ...(tx.cancellation_details && {
        failureReason: `${tx.cancellation_details.party}: ${tx.cancellation_details.reason}`
    }),
    confirmationUrl: tx.confirmation?.confirmation_url, // Для оплаты
    createdAt: new Date(tx.created_at),
    orderId: tx.metadata?.orderId, // orderId из metadata
    rawTransaction: tx
});
