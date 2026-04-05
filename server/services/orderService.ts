import { join } from 'path';
import PdfPrinter from 'pdfmake';
import { Types, type ClientSession } from 'mongoose';
import numberToWordsRuPkg from 'number-to-words-ru';
import User from '@server/db/models/User.js';
import Order from '@server/db/models/Order.js';
import { applyProductBulkUpdate } from './productService.js';
import { logCriticalEvent } from './criticalEventService.js';
import { ORDER_STORAGE_FOLDER, SERVER_ROOT, STORAGE_URL_PATH } from '@server/config/paths.js';
import { ORDER_MODEL_TYPE, ORDER_ADJUSTMENT_TYPE } from '@server/config/constants.js';
import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import { getLastFinancialsEventEntry, isEqualCurrency } from '@shared/commonHelpers.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import {
    USER_ROLE,
    CURRENCY,
    DELIVERY_METHOD,
    PAYMENT_METHOD,
    REFUND_METHOD,
    ORDER_STATUS,
    ORDER_STATUS_CONFIG,
    FINANCIALS_STATE,
    FINANCIALS_EVENT,
    TRANSACTION_TYPE
} from '@shared/constants.js';
import { COMPANY_DETAILS } from '@shared/company.js';
import type {
    TDbOrderFinal,
    TDbOrderDraftItem,
    TDbOrderFinalItem,
    TDbOrderStatusHistoryEntry,
    TDbOrderFinancialsEventEntry,
    TDbOrderCurrentOnlineTransaction,
    TDbOrderAuditLogEntry,
    IInvoiceDefinition,
    TFonts,
    ICalculateOrderFinancialsResult,
    IOrderItemRef,
    IOrderInvoiceResult,
    IApplyOrderFinancialsParams,
    IApplyOrderFinancialsResult
} from '@server/types/index.js';
import type {
    TActiveUserRole,
    IOrder,
    IOrderItem,
    TDeliveryMethod,
    TOrderStatus,
    TFinancialsState,
    TFinancialsEvent,
    IDelivery,
    IOrderStatusEntry,
    IOrderStatusEntrySummary,
    IFinancialsEventEntry,
    IFinancialsEventEntrySummary,
    ICurrentOnlineTransaction,
    IAuditLogEntry,
    IOrderStatusConfig,
    IOrderStatusStepConfig,
    TEntityType,
    TEntityField,
    TFieldErrors,
    TTransactionStatus
} from '@shared/types/index.js';

const { convert: convertNumberToWordsRu } = numberToWordsRuPkg;

export const orderDotNotationMap = {
    // Totals
    subtotalAmount: 'totals.subtotalAmount',
    totalSavings: 'totals.totalSavings',
    totalAmount: 'totals.totalAmount',

    // Customer info
    firstName: 'customerInfo.firstName',
    lastName: 'customerInfo.lastName',
    middleName: 'customerInfo.middleName',
    email: 'customerInfo.email',
    phone: 'customerInfo.phone',
  
    // Delivery
    deliveryMethod: 'delivery.deliveryMethod',
    allowCourierExtra: 'delivery.allowCourierExtra',
    region: 'delivery.shippingAddress.region',
    district: 'delivery.shippingAddress.district',
    city: 'delivery.shippingAddress.city',
    street: 'delivery.shippingAddress.street',
    house: 'delivery.shippingAddress.house',
    apartment: 'delivery.shippingAddress.apartment',
    postalCode: 'delivery.shippingAddress.postalCode',
    shippingCost: 'delivery.shippingCost',
  
    // Financials
    defaultPaymentMethod: 'financials.defaultPaymentMethod',
    financialsState: 'financials.state',
    totalPaid: 'financials.totalPaid',
    totalRefunded: 'financials.totalRefunded',
    eventHistory: 'financials.eventHistory',
    currentOnlineTransaction: 'financials.currentOnlineTransaction',
  
    // Notes
    customerComment: 'customerComment',
    internalNote: 'internalNote'
} as const;

export const prepareOrder = (
    dbOrder: TDbOrderFinal,
    {
        inList = true,
        managed = false,
        details = true,
        viewerRole = USER_ROLE.CUSTOMER
    }: {
        inList?: boolean;
        managed?: boolean;
        details?: boolean;
        viewerRole?: TActiveUserRole
    } = {}
): IOrder => ({
    id: dbOrder._id.toString(),
    orderNumber: dbOrder.orderNumber,
    confirmedAt: dbOrder.confirmedAt.toISOString(),
    ...(inList && !managed && { lastActivityAt: dbOrder.lastActivityAt.toISOString() }),
    statusHistory: prepareOrderStatusHistory(dbOrder.statusHistory, {
        latestSummary: inList || !managed
    }),
    totals: {
        ...(!inList && {
            subtotalAmount: dbOrder.totals.subtotalAmount,
            totalSavings: dbOrder.totals.totalSavings
        }),
        totalAmount: dbOrder.totals.totalAmount
    },
    ...(details
        ? { items: dbOrder.items.map(item => prepareOrderItem(item, {
            orderId: dbOrder._id.toString(),
            inList
        })) }
        : { totalItems: dbOrder.items.length }),
    ...(details && {
        customerInfo: {
            firstName: dbOrder.customerInfo.firstName,
            lastName: dbOrder.customerInfo.lastName,
            middleName: dbOrder.customerInfo.middleName ?? undefined,
            email: dbOrder.customerInfo.email,
            phone: dbOrder.customerInfo.phone,
            ...(!inList && {
                ...(managed && { customerId: dbOrder.customerId._id.toString() }),
                login: getPopulatedDbField(dbOrder.customerId, 'login'),
                registrationEmail: getPopulatedDbField(dbOrder.customerId, 'email')
            })
        }
    }),
    delivery: {
        deliveryMethod: dbOrder.delivery.deliveryMethod,
        allowCourierExtra: dbOrder.delivery.allowCourierExtra ?? undefined,
        ...(details && dbOrder.delivery.shippingAddress && {
            shippingAddress: {
                region: dbOrder.delivery.shippingAddress.region ?? undefined,
                district: dbOrder.delivery.shippingAddress.district ?? undefined,
                city: dbOrder.delivery.shippingAddress.city,
                street: dbOrder.delivery.shippingAddress.street,
                house: dbOrder.delivery.shippingAddress.house,
                apartment: dbOrder.delivery.shippingAddress.apartment ?? undefined,
                postalCode: dbOrder.delivery.shippingAddress.postalCode ?? undefined
            }
        }),
        ...((managed || details) && { shippingCost: dbOrder.delivery.shippingCost })
    },
    financials: {
        defaultPaymentMethod: dbOrder.financials.defaultPaymentMethod,
        state: dbOrder.financials.state,
        totalPaid: dbOrder.financials.totalPaid,
        totalRefunded: dbOrder.financials.totalRefunded,
        eventHistory: prepareFinancialsHistory(dbOrder.financials.eventHistory, {
            latestSummary: !managed
        }),
        currentOnlineTransaction: prepareCurrentOnlineTransaction(
            dbOrder.financials.currentOnlineTransaction,
            { inList, viewerRole }
        )
    },
    ...(managed && {
        customerComment: dbOrder.customerComment ?? undefined,
        internalNote: dbOrder.internalNote ?? undefined,
        ...(!inList && dbOrder.auditLog && { auditLog: prepareAuditlog(dbOrder.auditLog) })
    })
});

const prepareOrderItem = (
    item: TDbOrderFinalItem,
    { orderId, inList }: { orderId: string, inList: boolean }
): IOrderItem => ({
    productId: item.productId.toString(),
    image: prepareOrderItemImage(orderId, item.imageFilename),
    sku: item.sku ?? undefined,
    name: item.name,
    brand: item.brand ?? undefined,
    quantity: item.quantity,
    unit: item.unit,
    appliedDiscount: item.appliedDiscount,
    finalUnitPrice: item.finalUnitPrice,
    totalPrice: item.totalPrice,
    ...(!inList && {
        originalUnitPrice: item.originalUnitPrice,
        appliedDiscountSource: item.appliedDiscountSource
    })
});

const prepareOrderItemImage = (
    orderId: string,
    filename: TDbOrderFinalItem['imageFilename']
): string | undefined => {
    if (!filename?.trim()) return undefined; // Опциональная картинка
    return [STORAGE_URL_PATH, ORDER_STORAGE_FOLDER, orderId, filename].join('/');
};

const prepareOrderStatusHistory = (
    history: TDbOrderStatusHistoryEntry[] = [],
    { latestSummary = false }: { latestSummary?: boolean } = {}
): (IOrderStatusEntry | IOrderStatusEntrySummary)[] => {
    const currentEntry = history.at(-1);

    // Заказ НЕ отменен
    if (currentEntry?.status !== ORDER_STATUS.CANCELLED) {
        if (latestSummary) {
            return currentEntry ? [summarizeOrderStatusEntry(currentEntry)] : [];
        }
        return history.map(e => mapFullOrderStatusEntry(e));
    }

    // Заказ ОТМЕНЕН
    const lastActiveStatus = getLastActiveOrderStatus(history);

    if (latestSummary) {
        return currentEntry ? [summarizeOrderStatusEntry(currentEntry, lastActiveStatus)] : [];
    }

    return history.map(e => {
        if (e.status === ORDER_STATUS.CANCELLED) {
            return mapFullOrderStatusEntry(e, lastActiveStatus);
        }
        return mapFullOrderStatusEntry(e);
    });
};

export const getLastActiveOrderStatus = (
    statusHistory: TDbOrderStatusHistoryEntry[]
): TOrderStatus => {
    const lastActive = statusHistory
        .filter(e => ORDER_STATUS_CONFIG[e.status]?.active)
        .at(-1)?.status;

    return lastActive ?? ORDER_STATUS.CONFIRMED;
};

const mapFullOrderStatusEntry = (
    e: TDbOrderStatusHistoryEntry,
    lastActiveStatus?: TOrderStatus
): IOrderStatusEntry => ({
    status: e.status,
    isRollback: e.isRollback ?? undefined,
    changes: e.changes?.map(change => ({
        field: change.field,
        oldValue: change.oldValue ?? undefined,
        newValue: change.newValue ?? undefined,
        currency: change.currency ?? undefined
    })) ?? undefined,
    cancellationReason: e.cancellationReason ?? undefined,
    changedBy: {
        id: e.changedBy.id.toString(), 
        name: e.changedBy.name,
        role: e.changedBy.role
    },
    changedAt: e.changedAt.toISOString(), 
    lastActiveStatus
});

const summarizeOrderStatusEntry = (
    e: TDbOrderStatusHistoryEntry,
    lastActiveStatus?: TOrderStatus
): IOrderStatusEntrySummary => ({
    status: e.status,
    changedAt: e.changedAt.toString(),
    lastActiveStatus
});

const prepareFinancialsHistory = (
    history: TDbOrderFinancialsEventEntry[] = [],
    { latestSummary = false }: { latestSummary?: boolean } = {}
): (IFinancialsEventEntry | IFinancialsEventEntrySummary)[] => {
    if (latestSummary) {
        const currentEntry = getLastFinancialsEventEntry(history);
        return currentEntry ? [summarizeFinancialsEventEntry(currentEntry)] : [];
    }

    return history.map(mapFullFinancialsEventEntry);
};

const mapFullFinancialsEventEntry = (e: TDbOrderFinancialsEventEntry): IFinancialsEventEntry => ({
    eventId: e.eventId.toString(),
    event: e.event,
    action: {
        method: e.action.method,
        amount: e.action.amount,
        provider: e.action.provider ?? undefined,
        transactionId: e.action.transactionId ?? undefined,
        originalPaymentId: e.action.originalPaymentId ?? undefined,
        failureReason: e.action.failureReason ?? undefined,
        externalReference: e.action.externalReference ?? undefined
    },
    changedBy: {
        id: e.changedBy.id?.toString() ?? undefined,
        name: e.changedBy.name,
        role: e.changedBy.role
    },
    changedAt: e.changedAt.toISOString(),
    voided: e.voided ? {
        flag: e.voided.flag,
        note: e.voided.note ?? undefined,
        changedBy: {
            id: e.voided.changedBy.id.toString(),
            name: e.voided.changedBy.name,
            role: e.voided.changedBy.role
        },
        changedAt: e.voided.changedAt.toISOString()
    } : undefined
});

const summarizeFinancialsEventEntry = (
    e: TDbOrderFinancialsEventEntry
): IFinancialsEventEntrySummary => ({
    event: e.event,
    action: { amount: e.action.amount },
    changedAt: e.changedAt.toString()
});

const prepareCurrentOnlineTransaction = (
    currentOnlineTx: TDbOrderCurrentOnlineTransaction | null | undefined,
    { inList, viewerRole }: { inList: boolean, viewerRole: TActiveUserRole }
): ICurrentOnlineTransaction | undefined => {
    if (!currentOnlineTx) return undefined;

    const transactionType = currentOnlineTx.type;
    const canSeeConfirmation = !inList && (
        (viewerRole === USER_ROLE.CUSTOMER && transactionType === TRANSACTION_TYPE.PAYMENT) ||
        (viewerRole === USER_ROLE.ADMIN && transactionType === TRANSACTION_TYPE.REFUND)
    );

    return {
        type: transactionType,
        ...(!inList && { 
            providers: currentOnlineTx.providers,
            status: currentOnlineTx.status,
            amount: currentOnlineTx.amount
        }),
        ...(canSeeConfirmation && { confirmationUrl: currentOnlineTx.confirmationUrl ?? undefined }),
    };
};

const prepareAuditlog = (auditLog: TDbOrderAuditLogEntry[]): IAuditLogEntry[] =>
    auditLog.map(e => ({
        changes: e.changes.map(change => ({
            field: change.field,
            oldValue: change.oldValue ?? undefined,
            newValue: change.newValue ?? undefined,
            currency: change.currency ?? undefined
        })),
        reason: e.reason,
        changedBy: {
            id: e.changedBy.id.toString(),
            name: e.changedBy.name,
            role: e.changedBy.role
        },
        changedAt: e.changedAt.toISOString()
    }));

export const prepareShippingCost = (
    deliveryMethod: TDeliveryMethod,
    allowCourierExtra: boolean
): IDelivery['shippingCost'] =>
    deliveryMethod === DELIVERY_METHOD.COURIER && !allowCourierExtra
        ? 0
        : deliveryMethod === DELIVERY_METHOD.SELF_PICKUP
            ? undefined
            : null;

export const calculateOrderTotals = (
    dbOrderItemList: (TDbOrderDraftItem | TDbOrderFinalItem)[],
    { confirmed = false }: { confirmed?: boolean } = {}
): {
    subtotalAmount: number;
    totalSavings: number;
    totalAmount: number;
} => {
    let subtotalAmount = 0;
    let totalAmount = 0;

    dbOrderItemList.forEach(dbItem => {
        const quantity = dbItem.quantity;
        let price: number;
        let discount: number;

        if (confirmed) {
            const finalDbItem = dbItem as TDbOrderFinalItem;
            price = finalDbItem.originalUnitPrice;
            discount = finalDbItem.appliedDiscount;
        } else {
            const draftDbItem = dbItem as TDbOrderDraftItem;
            price = draftDbItem.priceSnapshot;
            discount = draftDbItem.appliedDiscountSnapshot;
        }

        const itemSubtotal = price * quantity;
        const discountFactor = 1 - discount / 100;
        const itemTotal = itemSubtotal * discountFactor;

        subtotalAmount += itemSubtotal;
        totalAmount += itemTotal;
    });

    const totalSavings = subtotalAmount - totalAmount;

    return {
        subtotalAmount: Number(subtotalAmount.toFixed(2)),
        totalSavings: Number(totalSavings.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2))
    };
};

export const calculateOrderFinancials = (
    history: TDbOrderFinancialsEventEntry[]
): ICalculateOrderFinancialsResult => {
    return history.reduce(
        (acc, entry) => {
            if (entry.voided?.flag) return acc;

            if (entry.event === FINANCIALS_EVENT.PAYMENT_SUCCESS) {
                acc.totalPaid += entry.action.amount;
            } else if (entry.event === FINANCIALS_EVENT.REFUND_SUCCESS) {
                acc.totalRefunded += entry.action.amount;
            }
            return acc;
        },
        { totalPaid: 0, totalRefunded: 0 }
    );
};

export const getFinancialsState = (
    orderStatus: TOrderStatus,
    netPaid: number,
    totalAmount: number,
    eventHistory: TDbOrderFinancialsEventEntry[]
): TFinancialsState => {
    // Отменённый заказ
    if (orderStatus === ORDER_STATUS.CANCELLED) {
        if (isEqualCurrency(netPaid, 0)) {
            const wasPayment = checkFinancialsPaymentRecord(eventHistory);
            return wasPayment ? FINANCIALS_STATE.REFUNDED : FINANCIALS_STATE.VOIDED;
        }
        if (netPaid < 0) {
            return FINANCIALS_STATE.OVER_REFUNDED;
        }
        return FINANCIALS_STATE.REFUND_PENDING; // netPaid > 0
    }

    // Активный/завершённый заказ
    if (isEqualCurrency(netPaid, 0)) {
        return FINANCIALS_STATE.PAID_PENDING;
    }
    if (netPaid < 0) {
        return FINANCIALS_STATE.PAID_NEGATIVE;
    }
    if (isEqualCurrency(netPaid, totalAmount)) {
        return FINANCIALS_STATE.PAID;
    }
    if (netPaid < totalAmount) {
        return FINANCIALS_STATE.PAID_PARTIAL;
    }
    return FINANCIALS_STATE.OVERPAID; // netPaid > totalAmount
};

// Проверка существования успешной оплаты в истории финансовых событий заказа
const checkFinancialsPaymentRecord = (eventHistory: TDbOrderFinancialsEventEntry[]): boolean =>
    eventHistory.some(e => !e.voided?.flag && e.event === FINANCIALS_EVENT.PAYMENT_SUCCESS);

// Проверка существования ID транзакции в истории финансовых событий заказа
export const checkFinancialsTransactionRecord = (
    history: TDbOrderFinancialsEventEntry[],
    transactionId: string
): boolean => history.some(e => !e.voided?.flag && e.action.transactionId === transactionId);

export const getOrderTransitionData = (
    deliveryMethod: TDeliveryMethod,
    currentOrderStatus: TOrderStatus,
    stepDelta: 1 | -1 = 1
): {
    newOrderStatus: TOrderStatus;
    rollbackAllowed: boolean;
} => {
    const orderStatusSteps = (Object.entries(ORDER_STATUS_CONFIG) as [TOrderStatus, IOrderStatusConfig][])
        .filter((entry): entry is [TOrderStatus, IOrderStatusStepConfig] => {
            const [_, cfg] = entry;
            return !!cfg.step && (
                cfg.step.deliveryMethods.includes('all') || 
                cfg.step.deliveryMethods.includes(deliveryMethod)
            );
        })
        .sort((a, b) => a[1].step.order - b[1].step.order)
        .map(([status, cfg]) => ({ status, ...cfg.step }));
    const currentStepIdx = orderStatusSteps.findIndex(step => step.status === currentOrderStatus);

    return {
        newOrderStatus: orderStatusSteps[currentStepIdx + stepDelta]?.status ?? currentOrderStatus,
        rollbackAllowed: orderStatusSteps[currentStepIdx]?.rollbackAllowed ?? false
    };
};

export const returnProductsToStore = async (
    orderItemList: IOrderItemRef[],
    session: ClientSession
): Promise<void> => {
    await applyProductBulkUpdate(orderItemList, ORDER_ADJUSTMENT_TYPE.RETURN, session);
};

export const getFieldErrors = <E extends TEntityType>(
    invalidFields: TEntityField<E>[],
    entityType: E
): TFieldErrors<E> =>
    Object.fromEntries(
        invalidFields.map(field => [
            field,
            fieldErrorMessages[entityType]?.[field]?.mismatch ||
                fieldErrorMessages[entityType]?.[field]?.default ||
                DEFAULT_FIELD_ERROR_MESSAGE
        ])
    ) as TFieldErrors<E>;

export const applyOrderFinancials = (
    dbOrder: TDbOrderFinal,
    {
        transactionType,
        financials,
        amount,
        method,
        provider, // Для онлайн-оплаты/возврата и банковского перевода оффлайн
        transactionId, // Для онлайн-оплаты/возврата и банковского перевода оффлайн
        originalPaymentId, // Для онлайн возврата на карту
        markAsFailed,
        failureReason, // Для онлайн-оплаты/возврата и банковского перевода оффлайн
        externalReference, // Для оффлайн возврата на карту
        actor,
        createdAt // Для онлайн-оплаты/возврата
    }: IApplyOrderFinancialsParams
): IApplyOrderFinancialsResult => {
    const isPayment = transactionType === TRANSACTION_TYPE.PAYMENT;
    const isRefund = transactionType === TRANSACTION_TYPE.REFUND;

    let { totalPaid: newTotalPaid, totalRefunded: newTotalRefunded } = financials;
    let financialsEvent: TFinancialsEvent;

    if (isPayment) {
        if (!markAsFailed) {
            newTotalPaid += amount;
            financialsEvent = FINANCIALS_EVENT.PAYMENT_SUCCESS;
        } else {
            financialsEvent = FINANCIALS_EVENT.PAYMENT_FAILED;
        }
    } else if (isRefund) {
        if (!markAsFailed) {
            newTotalRefunded += amount;
            financialsEvent = FINANCIALS_EVENT.REFUND_SUCCESS;
        } else {
            financialsEvent = FINANCIALS_EVENT.REFUND_FAILED;
        }
    } else {
        throw new Error(`Некорректный тип транзакции: ${transactionType}`);
    }

    const newNetPaid = newTotalPaid - newTotalRefunded;
    const isBankTransfer =
        (method as unknown) === PAYMENT_METHOD.BANK_TRANSFER || 
        (method as unknown) === REFUND_METHOD.BANK_TRANSFER;
    const isCardOnline =
        (method as unknown) === PAYMENT_METHOD.CARD_ONLINE || 
        (method as unknown) === REFUND_METHOD.CARD_ONLINE;
    const isCardOffline = (method as unknown) === REFUND_METHOD.CARD_OFFLINE;
    const now = new Date();

    dbOrder.lastActivityAt = now;
    dbOrder.financials.totalPaid = +(newTotalPaid.toFixed(2));
    dbOrder.financials.totalRefunded = +(newTotalRefunded.toFixed(2));
    dbOrder.financials.state = getFinancialsState(
        dbOrder.currentStatus,
        newNetPaid,
        dbOrder.totals.totalAmount,
        dbOrder.financials.eventHistory // Старая история, ДО добавления новой записи
    );
    dbOrder.financials.eventHistory.push({
        event: financialsEvent,
        action: {
            method,
            amount,
            ...((isBankTransfer || isCardOnline) && {
                provider,
                transactionId,
                ...(markAsFailed && { failureReason })
            }),
            ...(isCardOnline && isRefund && { originalPaymentId }),
            ...(isCardOffline && isRefund && { externalReference })
        },
        changedBy: { id: actor._id, name: actor.name, role: actor.role },
        changedAt: createdAt || now
    });

    return { newNetPaid };
};

export const updateCustomerTotalSpent = async (
    customerId: Types.ObjectId,
    amountDelta: number,
    session: ClientSession,
    logContext: string = ''
): Promise<void> => {
    const amountDeltaSafe = +Number(amountDelta).toFixed(2);
    if (amountDeltaSafe === 0) return;

    // Атомарное обновление общей суммы оплат с округлением
    const updateResult = await User.updateOne(
        { _id: customerId },
        [{ $set: { totalSpent: { $round: [{ $add: ['$totalSpent', amountDeltaSafe] }, 2] } } }],
        { session }
    );

    // Логирование события, когда покупатель не найден в базе
    if (updateResult.matchedCount === 0) {
        logCriticalEvent({
            logContext,
            category: 'financials',
            reason: 'Целостность данных нарушена: пользователь не найден для обновления баланса',
            data: {
                customerId,
                amountDelta: amountDeltaSafe,
                action: 'updateCustomerTotalSpent'
            }
        });
    }
};

export const clearOrderOnlineTransaction = async (
    orderId: string | Types.ObjectId,
    stuckStatus: TTransactionStatus
): Promise<number> => {
    const updateResult = await Order.updateOne(
        {
            _id: orderId,
            _modelType: ORDER_MODEL_TYPE.FINAL,
            'financials.currentOnlineTransaction.status': stuckStatus
        },
        { $unset: { 'financials.currentOnlineTransaction': '' } }
    );

    return updateResult.modifiedCount;
};

export const generateOrderInvoicePdf = (dbOrder: TDbOrderFinal): IOrderInvoiceResult => {
    // Подготовка данных
    const dbOrderItemList = dbOrder.items || [];
    const totalOrderItems = dbOrderItemList.length;
    const normalizedOrderItemList = dbOrderItemList.map((item, idx) => ({
        no: idx + 1,
        sku: item.sku || '—',
        title: item.name + (item.brand ? ` «${item.brand}»` : ''),
        qty: item.quantity,
        unit: item.unit,
        unitPrice: item.finalUnitPrice,
        lineTotal: item.totalPrice
    }));

    const dbCustomerInfo = dbOrder.customerInfo || {};
    const customerFullName = [
        dbCustomerInfo.lastName,
        dbCustomerInfo.firstName,
        dbCustomerInfo.middleName ?? null // Опционально
    ].filter(Boolean).join(' ') || '—';

    const totalAmount =
        dbOrder.totals?.totalAmount ??
        normalizedOrderItemList.reduce((acc, item) => acc + item.lineTotal, 0);
    const formattedTotalAmount = fmtCurrency(totalAmount);

    const totalAmountText = `Всего позиций: ${totalOrderItems}, на сумму: ${formattedTotalAmount} RUB`;

    const totalAmountInWords = convertNumberToWordsRu(totalAmount, {
        currency: CURRENCY.RUB,
        convertNumberToWords: {
            integer: true,
            fractional: true,
        },
        showCurrency: {
            integer: true,
            fractional: true,
        },
    });

    // Заполнение документа
    const docDefinition: IInvoiceDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        styles: {
            mainHeader: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
            blockHeader: { fontSize: 11, bold: true, margin: [0, 0, 0, 1] },
            tableHeader: { bold: true, fontSize: 10, color: 'black' },
            medium: { font: 'RobotoMedium', fontSize: 10 },
            small: { fontSize: 9 }
        },
        content: [
            // Header
            { text: `«${COMPANY_DETAILS.shopName}»`, style: 'mainHeader', alignment: 'right' },
            { text: 'Счёт на оплату заказа', style: 'medium', fontSize: 12, alignment: 'right' },
            { text: `Номер: ${dbOrder.orderNumber}`, alignment: 'right' },
            { text: `От: ${fmtDate(dbOrder.confirmedAt)}`, alignment: 'right', style: 'small' },
            { text: '\n\n' },

            // Shop Info
            { text: 'Поставщик:', style: 'blockHeader' },
            { text: COMPANY_DETAILS.companyName, style: 'medium' },
            { text: `Адрес: ${COMPANY_DETAILS.displayAddress}`, style: 'small' },
            { text: `Тел: ${COMPANY_DETAILS.phone}`, style: 'small' },
            { text: `Email: ${COMPANY_DETAILS.emails.info}`, style: 'small' },
            { text: '\n' },

            // Customer Info
            { text: 'Покупатель:', style: 'blockHeader' },
            { text: customerFullName, style: 'medium' },
            { text: `Тел.: ${dbCustomerInfo.phone || '—'}`, style: 'small' },
            { text: `Email: ${dbCustomerInfo.email || '—'}`, style: 'small' },
            { text: '\n\n' },

            // OrderList Table
            {
                table: {
                    widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
                    heights: (rowIndex: number): number | undefined => rowIndex === 0 ? 24 : undefined,
                    body: [
                        [
                            { text: '№', style: 'tableHeader', alignment: 'right' },
                            { text: 'Артикул', style: 'tableHeader' },
                            { text: 'Наименование товара', style: 'tableHeader', alignment: 'center' },
                            { text: 'Количество', style: 'tableHeader', colSpan: 2, alignment: 'center' },
                            {},
                            { text: 'Цена', style: 'tableHeader', alignment: 'right' },
                            { text: 'Сумма', style: 'tableHeader', alignment: 'right' }
                        ],
                        ...normalizedOrderItemList.map(item => [
                            { text: item.no.toString(), alignment: 'right' },
                            item.sku,
                            item.title,
                            { text: item.qty.toString(), alignment: 'center' },
                            { text: item.unit, alignment: 'center' },
                            { text: fmtCurrency(item.unitPrice), alignment: 'right' },
                            { text: fmtCurrency(item.lineTotal), alignment: 'right' }
                        ])
                    ]
                },
                layout: {
                    hLineWidth: () => 0.3, // Толщина горизонтальных линий
                    vLineWidth: () => 0.3, // Толщина вертикальных линий
                }
            },
            { text: '\n' },

            // Totals
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 150,
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    { text: { text: 'Итого:', bold: true } },
                                    { text: { text: formattedTotalAmount, bold: true }, alignment: 'right' }
                                ],
                                [
                                    { text: { text: 'Без НДС:', bold: true } },
                                    { text: { text: '—', bold: true }, alignment: 'right' }
                                ]
                            ]
                        },
                        layout: 'noBorders'
                    }
                ]
            },
            { text: '\n\n' },
            { text: totalAmountText },
            { text: [{ text: 'Сумма прописью: ' }, { text: totalAmountInWords, italics: true }]},
            { text: '\n\n' },

            // Bank Details
            { text: 'Банковские реквизиты:', style: 'blockHeader' },
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: `Получатель: ${COMPANY_DETAILS.companyName}` },
                            { text: `ИНН: ${COMPANY_DETAILS.inn}` },
                            { text: `ОГРН: ${COMPANY_DETAILS.ogrn}` },
                            { text: `Юр. адрес: ${COMPANY_DETAILS.legalAddress}` }
                        ]
                    },
                    {
                        width: '40%',
                        stack: [
                            { text: `Банк: ${COMPANY_DETAILS.bank.name}`, alignment: 'right' },
                            { text: `БИК: ${COMPANY_DETAILS.bank.bik}`, alignment: 'right' },
                            { text: `Р/с: ${COMPANY_DETAILS.bank.rs}`, alignment: 'right' },
                            { text: `К/с: ${COMPANY_DETAILS.bank.ks}`, alignment: 'right' }
                        ]
                    }
                ]
            }
        ],

        // Вывод номера страницы
        footer: (currentPage, pageCount) => {
            if (pageCount === 1) return null;
            return { text: `Страница ${currentPage} из ${pageCount}`, alignment: 'center', fontSize: 8 };
        }
    };

    // Подключение шрифтов к экземпляру PdfPrinter
    const fonts: TFonts = {
        Roboto: {
            normal: join(SERVER_ROOT, 'pdf', 'fonts', 'Roboto-Regular.ttf'),
            bold: join(SERVER_ROOT, 'pdf', 'fonts', 'Roboto-Bold.ttf'),
            italics: join(SERVER_ROOT, 'pdf', 'fonts', 'Roboto-Italic.ttf')
        },
        RobotoMedium: {
            normal: join(SERVER_ROOT, 'pdf', 'fonts', 'Roboto-Medium.ttf')
        }
    };
    const printer = new PdfPrinter(fonts);

    // Создание pdf документа с данными
    const pdfDoc = printer.createPdfKitDocument(docDefinition as any);
    const filename = `invoice_${dbOrder.orderNumber}.pdf`;

    return { pdfDoc, filename };
};

const fmtDate = (date: Date | string): string => {
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('ru-RU');
};

const fmtCurrency = (amount: unknown): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '—';
    return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
