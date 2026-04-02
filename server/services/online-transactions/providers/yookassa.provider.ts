import { randomUUID } from 'crypto';
import {
    YooCheckout,
    type ICreatePayment,
    type ICreateRefund,
    type Payment,
    type Refund
} from '@a2seven/yoo-checkout';
import ipRangeCheck from 'ip-range-check';
import config from '@server/config/config.js';
import { typeCheck } from '@server/utils/typeValidation.js';
import log from '@server/utils/logger.js';
import { toError } from '@shared/commonHelpers.js';
import { TRANSACTION_TYPE, CARD_ONLINE_PROVIDER } from '@shared/constants.js';
import type { Request } from 'express';
import type {
    TDbOrderWithTx,
    IYooKassaWebhook,
    TExternalTx,
    TAnyExternalTx,
    TYooKassaExternalTx,
    IYooKassaListResponse,
    ICreateOnlinePaymentParams,
    ICreateOnlinePaymentResult,
    ICreateOnlineRefundsParams,
    ICreateOnlineRefundsResult,
    ICreateOnlineRefundsResultError,
    INormalizedWebhook,
    INormalizedExternalTx
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

export const normalizeYooKassaWebhook = <T = IYooKassaWebhook>(
    payload: unknown
): INormalizedWebhook<T> | null => {
    const { type, event, object: wh } = (payload ?? {}) as IYooKassaWebhook;

    if (type !== 'notification' || !typeCheck.string(event) || !typeCheck.object(wh)) {
        return null;
    }

    const isPayment = event.startsWith('payment.');
    const isRefund = event.startsWith('refund.');
    if (!isPayment && !isRefund) return null;

    return {
        provider: CARD_ONLINE_PROVIDER.YOOKASSA,
        transactionType: isPayment ? TRANSACTION_TYPE.PAYMENT : TRANSACTION_TYPE.REFUND,
        transactionId: wh.id,
        originalPaymentId: 'payment_id' in wh ? wh.payment_id : undefined, // Для возврата
        amount: Number(wh.amount.value),
        markAsFailed: event.endsWith('.canceled'),
        ...('cancellation_details' in wh && { // Для оплаты
            failureReason: `${wh.cancellation_details.party}: ${wh.cancellation_details.reason}`
        }),
        createdAt: new Date(wh.created_at),
        orderId: 'metadata' in wh ? wh.metadata?.orderId : undefined,
        rawPayload: payload as T
    };
};

export const fetchYooKassaExternalTransactions = async (
    stuckDbOrders: TDbOrderWithTx[]
): Promise<TExternalTx<TYooKassaExternalTx>[]> => {
    // Поиск минимальной даты создания записи транзакции для временного окна поиска
    const minStartedAt = stuckDbOrders.reduce((minDate, order) => {
        const startedAt = new Date(order.financials.currentOnlineTransaction.startedAt);
        return startedAt < minDate ? startedAt : minDate;
    }, new Date());
    
    // Добавление небольшого люфта (1 минуту) назад на случай задержек записи в БД
    const searchStartTimeISO = new Date(minStartedAt.getTime() - 60 * 1000).toISOString();

    // Флаги наличия оплат и/или возвратов
    const hasPendingPayments = stuckDbOrders.some(
        order => order.financials.currentOnlineTransaction.type === TRANSACTION_TYPE.PAYMENT
    );
    const hasPendingRefunds = stuckDbOrders.some(
        order => order.financials.currentOnlineTransaction.type === TRANSACTION_TYPE.REFUND
    );

    // Параметры запроса списков в YooKassa по умолчанию
    const yooKassaParams = { 'created_at_gte': searchStartTimeISO, limit: 100 };
    
    // Получение списков оплат и возвратов от YooKassa с использование пагинации по курсору
    let allExternalTransactions: TExternalTx<TYooKassaExternalTx>[] = [];
    let paymentsNextCursor: string | null = null;
    let refundsNextCursor: string | null = null;
    let isFetchingPayments: boolean = hasPendingPayments;
    let isFetchingRefunds: boolean = hasPendingRefunds;

    do {
        // Параллельные запросы оплат и возвратов в YooKassa
        const paymentsPromise: Promise<IYooKassaListResponse<Payment>> = isFetchingPayments 
            ? yooKassaCheckout.getPaymentList({
                ...yooKassaParams,
                ...(paymentsNextCursor && { cursor: paymentsNextCursor })
            })
            : Promise.resolve({ type: 'list', items: [] });

        const refundsPromise: Promise<IYooKassaListResponse<Refund>> = isFetchingRefunds 
            ? yooKassaCheckout.getRefundList({
                ...yooKassaParams,
                ...(refundsNextCursor && { cursor: refundsNextCursor })
            })
            : Promise.resolve({ type: 'list', items: [] });

        const [paymentsResponse, refundsResponse] = await Promise.all([paymentsPromise, refundsPromise]);

        // Заполнение массива транзакций
        paymentsResponse.items.forEach(tx => {
            allExternalTransactions.push({ ...tx, transactionType: TRANSACTION_TYPE.PAYMENT });
        });
        refundsResponse.items.forEach(tx => {
            allExternalTransactions.push({ ...tx, transactionType: TRANSACTION_TYPE.REFUND });
        });
        
        // ЮKassa возвращает cursor, если записей больше, чем limit
        paymentsNextCursor = paymentsResponse.next_cursor ?? null;
        refundsNextCursor = refundsResponse.next_cursor ?? null;

        // Обновление флагов запросов оплат и возвратов в зависимости от наличия курсора
        isFetchingPayments = !!paymentsNextCursor;
        isFetchingRefunds = !!refundsNextCursor;
    } while (isFetchingPayments || isFetchingRefunds);

    return allExternalTransactions;
};

export const normalizeYooKassaExternalTransaction = <T = TAnyExternalTx>(
    transaction: TAnyExternalTx
): INormalizedExternalTx<T> => {
    const tx = transaction as TExternalTx<TYooKassaExternalTx>;

    return {
        provider: CARD_ONLINE_PROVIDER.YOOKASSA,
        transactionType: tx.transactionType, // Получено в fetchYooKassaExternalTransactions
        transactionId: tx.id,
        originalPaymentId: 'payment_id' in tx ? tx.payment_id: undefined, // Для возврата
        amount: Number(tx.amount.value),
        finished: ['succeeded', 'canceled'].includes(tx.status),
        markAsFailed: tx.status === 'canceled',
        ...('cancellation_details' in tx && { // Для оплаты
            failureReason: `${tx.cancellation_details.party}: ${tx.cancellation_details.reason}`
        }),
        confirmationUrl: 'confirmation' in tx ? tx.confirmation?.confirmation_url : undefined, // Для оплаты
        createdAt: new Date(tx.created_at),
        orderId: 'metadata' in tx ? tx.metadata?.orderId: undefined,
        rawTransaction: tx as T
    };
};
