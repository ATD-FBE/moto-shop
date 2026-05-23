import { formatDateToMoscowLog, formatProductTitle, formatCurrency } from '@/helpers/textHelpers.js';
import { TEXT_LOG_LINE_BREAK, NO_VALUE_LABEL } from '@/config/constants.js';
import {
    DELIVERY_METHOD,
    PAYMENT_METHOD_OPTIONS,
    REFUND_METHOD_OPTIONS,
    BANK_PROVIDER_OPTIONS,
    CARD_ONLINE_PROVIDER_OPTIONS,
    FINANCIALS_EVENT_CONFIG
} from '@shared/constants.js';
import type {
    TPaymentMethod,
    TRefundMethod,
    TBankProvider,
    TCardOnlineProvider,
    IOrderStatusEntry,
    IOrderStatusEntrySummary,
    IFinancialsEventEntry,
    IFinancialsEventEntrySummary,
    IAuditLogEntry,
    IProductAdjustment,
    TDeliveryMethod,
    IDelivery
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFinancialMethodMap = Record<
    TPaymentMethod | TRefundMethod,
    typeof PAYMENT_METHOD_OPTIONS[number] | typeof REFUND_METHOD_OPTIONS[number]
>;

type TProviderMap = Record<
    TBankProvider | TCardOnlineProvider,
    typeof BANK_PROVIDER_OPTIONS[number] | typeof CARD_ONLINE_PROVIDER_OPTIONS[number]
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const FINANCIAL_METHOD_MAP = [...PAYMENT_METHOD_OPTIONS, ...REFUND_METHOD_OPTIONS]
    .reduce((map, opt) => {
        map[opt.value] = opt;
        return map;
    }, {} as TFinancialMethodMap);

const PROVIDER_MAP = [...BANK_PROVIDER_OPTIONS, ...CARD_ONLINE_PROVIDER_OPTIONS]
    .reduce((map, opt) => {
        map[opt.value] = opt;
        return map;
    }, {} as TProviderMap);

export const formatOrderStatusHistoryLogs = (orderStatusHistory: IOrderStatusEntry[] = []): string =>
    orderStatusHistory.reduce((acc, entry) => {
        const { status, isRollback, changes, cancellationReason, changedBy, changedAt } = entry;
        let line = '';

        // Добавление отката в первую очередь, если есть
        if (isRollback) {
            line += '[ОТКАТ] ';
        }

        // Добавление даты и статуса
        line += `[${formatDateToMoscowLog(changedAt)}] — Статус: [${status.toUpperCase()}]`;

        // Добавление причины отмены, если есть
        if (cancellationReason) {
            line += ` — Причина отмены: "${cancellationReason}"`;
        }

        // Добавление изменений, если они есть
        if (changes && changes.length > 0) {
            const changesStr = changes.map(change => {
                const oldValue = formatChangeValue(change.oldValue, change.currency);
                const newValue = formatChangeValue(change.newValue, change.currency);
                return `${change.field}: ${oldValue} → ${newValue}`;
            }).join('; ');

            line += ` — Изменения: { ${changesStr} }`;
        }

        // Добавление данных об операторе, изменившем статус (только пользователь)
        const changedByInfo = changedBy
            ? `${changedBy.name} (ID: ${changedBy.id}, роль: ${changedBy.role})`
            : NO_VALUE_LABEL;
        line += ` — Изменено: ${changedByInfo}`;

        return acc + line + TEXT_LOG_LINE_BREAK;
    }, '').slice(0, -TEXT_LOG_LINE_BREAK.length);

export const formatFinancialsEventHistoryLogs = (eventHistory: IFinancialsEventEntry[] = []): string =>
    eventHistory.reduce((acc, entry) => {
        const { eventId, event, action, changedBy, changedAt, voided } = entry;
        let line = '';

        // Добавление voided-префиксов в первую очередь
        if (voided?.flag) {
            const voidedBy = voided.changedBy;
            const voidedAt = voided.changedAt;
            const voidedByInfo = voidedBy
                ? `${voidedBy.name} (ID: ${voidedBy.id}, роль: ${voidedBy.role})`
                : NO_VALUE_LABEL;
                
            line += `[АННУЛИРОВАНО от ${formatDateToMoscowLog(voidedAt)}, кем: ${voidedByInfo}`;
            if (voided.note) line += `, причина: "${voided.note}"`;
            line += '] — ';
        }

        // Добавление даты
        line += `[${formatDateToMoscowLog(changedAt)}]`;

        // Добавление события
        const eventLbl = FINANCIALS_EVENT_CONFIG[event]?.label ?? event;
        line += ` — Событие: [${eventLbl.toUpperCase()}] [ID записи: ${eventId}]`;

        // Добавление деталей оплаты/возврата
        const details = [
            `Способ: ${FINANCIAL_METHOD_MAP[action.method]?.label ?? action.method}`,
            `Сумма: ${formatCurrency(action.amount)} ₽`,
            ...(action.provider ? [`Провайдер: ${PROVIDER_MAP[action.provider].label ?? '---'}`] : []),
            ...(action.transactionId ? [`ID транзакции: ${action.transactionId}`] : []),
            ...(action.originalPaymentId ? [`ID исходного платежа: ${action.originalPaymentId}`] : []),
            ...(action.failureReason ? [`Причина отказа: "${action.failureReason}"`] : []),
            ...(action.externalReference ? [`Источник: ${action.externalReference}`] : []),
        ];

        line += ` — Детали: { ${details.join('; ')} }`;

        // Добавление данных об операторе, добавившем запись (пользователь или SYSTEM)
        const changedByMeta = [
            changedBy?.id ? `ID: ${changedBy.id}` : null,
            changedBy?.role ? `роль: ${changedBy.role}` : null
        ].filter(Boolean).join(', ');
        
        const changedByInfo = changedBy
            ? `${changedBy.name}${changedByMeta ? ` (${changedByMeta})` : ''}`
            : NO_VALUE_LABEL;

        line += ` — Зафиксировано: ${changedByInfo}`;

        return acc + line + TEXT_LOG_LINE_BREAK;
    }, '').slice(0, -TEXT_LOG_LINE_BREAK.length);

export const formatAuditLogs = (auditLog: IAuditLogEntry[] = []): string =>
    auditLog.reduce((acc, entry) => {
        const { changes, reason, changedBy, changedAt } = entry;

        // Добавление даты
        let line = `[${formatDateToMoscowLog(changedAt)}]`;

        // Добавление изменений
        const changesStr = changes.map(change => {
            const oldValue = formatChangeValue(change.oldValue, change.currency);
            const newValue = formatChangeValue(change.newValue, change.currency);
            return `${change.field}: ${oldValue} → ${newValue}`;
        }).join('; ');

        line += ` — Изменения: { ${changesStr} }`;

        // Добавление причины
        line += ` — Причина: "${reason}"`;

        // Добавление данных об операторе, изменившем статус (только пользователь)
        const changedByInfo = changedBy
            ? `${changedBy.name} (ID: ${changedBy.id}, роль: ${changedBy.role})`
            : NO_VALUE_LABEL;
        line += ` — Изменено: ${changedByInfo}`;

        return acc + line + TEXT_LOG_LINE_BREAK;
    }, '').slice(0, -TEXT_LOG_LINE_BREAK.length);

export const formatOrderAdjustmentLogs = (productAdjustments: IProductAdjustment[] = []): string => {
    const logs: string[] = [];
    let num = 0;

    const addLog = (message: string): void => {
        logs.push(`<span className="bold">${++num}.</span> ${message}`);
    }

    for (const prod of productAdjustments) {
        const { id, name, brand, adjustments } = prod;
        const productTitle = formatProductTitle(name, brand) || `Товар (ID: ${id})`;
        const productTitleHtml = `<span className="cursive underline">"${productTitle}"</span>`;

        if (adjustments.deleted) {
            addLog(`<span className="color-red">Удалён</span> товар: ${productTitleHtml}.`);
        }

        if (adjustments.outOfStock) {
            addLog(`Товар <span className="color-red">закончился</span>: ${productTitleHtml}.`);
        }

        if (adjustments.quantityReduced) {
            const { old, corrected } = adjustments.quantityReduced;
            addLog(
                `<span className="color-red">Уменьшено количество</span> товара ${productTitleHtml}: ` +
                `с <span className="bold color-blue">${old}</span> ` +
                `до <span className="bold color-green">${corrected}</span>.`
            );
        }
    }

    return logs.join(TEXT_LOG_LINE_BREAK);
};

export const buildCustomerFullName = (
    firstName: string,
    lastName: string,
    middleName?: string
): string => [lastName, firstName, middleName].filter(Boolean).join(' ');    

export const buildShippingAddressDisplay = (
    deliveryMethod: TDeliveryMethod,
    shippingAddress: IDelivery['shippingAddress']
): string =>
    deliveryMethod === DELIVERY_METHOD.SELF_PICKUP || !shippingAddress
        ? NO_VALUE_LABEL
        : [
            shippingAddress.postalCode ?? null,                                    // Опционально
            shippingAddress.region ?? null,                                        // Опционально
            shippingAddress.district ? `${shippingAddress.district} район` : null, // Опционально
            `г. ${shippingAddress.city}`,
            `ул. ${shippingAddress.street}`,
            `д. ${shippingAddress.house}`,
            shippingAddress.apartment ? `кв. ${shippingAddress.apartment}` : null  // Опционально
        ].filter(Boolean).join(', ');

export const getShippingCostDisplay = (shippingCost?: number | null): string =>
    shippingCost === undefined
        ? NO_VALUE_LABEL
        : shippingCost === null
            ? '(уточняется)'
            : `${formatCurrency(shippingCost)} руб.`;


const formatChangeValue = (val: unknown, currency?: boolean): string => {
    if (val === null) return '<PENDING>';
    if (val === undefined) return '<UNDEFINED>';
    if (typeof val === 'object') return JSON.stringify(val);
    if (currency) return `${formatCurrency(val)} ₽`;
    return String(val);
};


///////////////////
/// TYPE GUARDS ///
///////////////////

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
