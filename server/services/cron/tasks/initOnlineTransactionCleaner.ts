import cron from 'node-cron';
import Order from '@server/db/models/Order.js';
import { ONLINE_TRANSACTION_INIT_EXPIRATION } from '@server/config/constants.js';
import {
    orderDotNotationMap,
    calculateOrderFinancials,
    checkFinancialsTransactionRecord,
    applyOrderFinancials,
    updateCustomerTotalSpent,
    clearOrderOnlineTransaction
} from '@server/services/orderService.js';
import {
    fetchExternalTransactions,
    normalizeExternalTransaction
} from '@server/services/online-transactions/onlineTransactionsService.js';
import * as sseOrderManagement from '@server/services/sse/sseOrderManagementService.js';
import { logCriticalEvent } from '@server/services/criticalEventService.js';
import { typeCheck } from '@server/validation/validationEngine.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import log from '@server/utils/logger.js';
import { toError } from '@shared/commonHelpers.js';
import {
    PAYMENT_METHOD,
    REFUND_METHOD,
    TRANSACTION_TYPE,
    TRANSACTION_STATUS,
    ORDER_STATUS
} from '@shared/constants.js';
import type {
    TDbOrderFinal,
    TDbOrderWithTx,
    TDbOrderFinalDoc,
    INormalizedExternalTx,
    TAnyExternalTx
} from '@server/types/index.js';
import type {
    TCardOnlineProvider,
    TTransactionStatus,
    IOrderUpdateData,
    IDotNotationPatch
} from '@shared/types/index.js';

const expirationMinutes = Math.floor(ONLINE_TRANSACTION_INIT_EXPIRATION / 60 / 1000);
const LOG_CTX = '[CRON ONLINE TRANSACTION CLEANER]';

export const startInitOnlineTransactionCleaner = (): void => {
    log.info(`${LOG_CTX} Очистка зависших онлайн-транзакций в заказах запущена`);

    cron.schedule(
        `*/${expirationMinutes} * * * *`, // Проверка каждые expirationMinutes минут
        async () => {
            const now = Date.now();
            const expirationTime = new Date(now - ONLINE_TRANSACTION_INIT_EXPIRATION);

            try {
                // Поиск зависших транзакций с установленным сроком истечения
                const stuckDbOrders = await Order.find({
                    currentStatus: { $ne: ORDER_STATUS.DRAFT },
                    'financials.currentOnlineTransaction.status': { 
                        $in: [TRANSACTION_STATUS.INIT, TRANSACTION_STATUS.PROCESSING] 
                    },
                    'financials.currentOnlineTransaction.startedAt': { $lte: expirationTime }
                }).lean<TDbOrderWithTx[]>();

                if (stuckDbOrders.length === 0) return;

                // Группирование заказов по провайдерам
                const stuckDbOrdersByProvider = groupStuckOrdersByProvider(stuckDbOrders);

                // Поиск и нормализация данных найденных транзакций по каждому провайдеру
                const allNormalizedTransactions: INormalizedExternalTx<TAnyExternalTx>[] = [];

                for (const [provider, providerOrders] of stuckDbOrdersByProvider.entries()) {
                    const fetchedTransactions = await fetchExternalTransactions(provider, providerOrders);
                    if (!fetchedTransactions.length) continue;

                    fetchedTransactions.forEach(tx => {
                        const normalizedTx = normalizeExternalTransaction(provider, tx);
                        if (normalizedTx) allNormalizedTransactions.push(normalizedTx);
                    });
                }
            
                // Создание карты транзакций по ID заказа, где значение - массив всех транзакций для заказа
                const orderTransactionsById = groupTransactionsByOrderId(allNormalizedTransactions);
                
                // Обработка каждого заказа из списка зависших
                for (const dbOrder of stuckDbOrders) {
                    const orderId = dbOrder._id.toString();
                    const stuckOnlineTxStatus = dbOrder.financials.currentOnlineTransaction.status;
                    
                    try {
                        const foundTransactions = orderTransactionsById.get(orderId);

                        // Транзакции не найдены => удаление данных онлайн транзакции и SSE-сообщ. админам
                        if (!foundTransactions || !foundTransactions.length) {
                            const clearedTransactionCount =
                                await clearOrderOnlineTransaction(orderId, stuckOnlineTxStatus);

                            if (clearedTransactionCount > 0) {
                                const orderPatches = [{
                                    path: orderDotNotationMap.currentOnlineTransaction,
                                    value: undefined
                                }];
                                const orderUpdateData: IOrderUpdateData = { orderPatches };
    
                                const sseMessageData = { orderUpdate: { orderId, orderUpdateData } };
                                sseOrderManagement.sendToAllClients(sseMessageData);
                            }

                            continue;
                        }

                        // Транзакции найдены => обработка всех транзакций пачкой
                        await processStuckTransactionGroup(orderId, stuckOnlineTxStatus, foundTransactions);
                    } catch (orderErr) {
                        log.error(`${LOG_CTX} Ошибка обработки заказа (ID: ${orderId}):`, toError(orderErr));
                    }
                };
                
                log.warn(
                    `${LOG_CTX} Обработано зависших заказов: ${stuckDbOrders.length}, ` +
                    `транзакций найдено: ${allNormalizedTransactions.length}`
                );
            } catch (cronErr) {
                log.error(`${LOG_CTX} Ошибка cron:`, toError(cronErr));
            }
        }
    );
};

const groupStuckOrdersByProvider = (
    stuckDbOrders: TDbOrderWithTx[]
): Map<TCardOnlineProvider, TDbOrderWithTx[]> => {
    const map = new Map<TCardOnlineProvider, TDbOrderWithTx[]>(); // provider => [order, ...]

    stuckDbOrders.forEach(dbOrder => {
        const providers = dbOrder.financials.currentOnlineTransaction.providers;
        if (!providers) return;

        for (const provider of providers) {
            map.set(provider, [...(map.get(provider) ?? []), dbOrder]);
        }
    });

    return map;
};

const groupTransactionsByOrderId = (
    transactions: INormalizedExternalTx<TAnyExternalTx>[]
): Map<string, INormalizedExternalTx<TAnyExternalTx>[]> => {
    const map = new Map<string, INormalizedExternalTx<TAnyExternalTx>[]>(); // orderId => [{}, ...]
                
    transactions.forEach(tx => {
        if (!tx.orderId || !typeCheck.objectId(tx.orderId)) return;
        map.set(tx.orderId, [...(map.get(tx.orderId) ?? []), tx]);
    });

    return map;
};

const processStuckTransactionGroup = async (
    orderId: string,
    stuckOnlineTxStatus: TTransactionStatus,
    transactionGroup: INormalizedExternalTx<TAnyExternalTx>[]
): Promise<void> => {
    const { shouldClearTransaction, orderUpdateData } = await runInDbTransaction<{
        shouldClearTransaction: boolean;
        orderUpdateData: IOrderUpdateData | null;
    }>(async (session) => {
        // Обновление данных заказа
        const dbOrder = await Order.findById<TDbOrderFinalDoc>(orderId).session(session);

        // Проверка, не обработан ли заказ к этому времени
        const currentOnlineTx = dbOrder?.financials.currentOnlineTransaction;

        if (!currentOnlineTx || currentOnlineTx.status !== stuckOnlineTxStatus) {
            return { shouldClearTransaction: false, orderUpdateData: null };
        }
        if (dbOrder.currentStatus === ORDER_STATUS.DRAFT) {
            logCriticalEvent({
                logContext: LOG_CTX,
                category: 'financials',
                reason:
                    `Найдены онлайн-транзакции для заказа №${dbOrder.orderNumber} ` +
                    `в статусе ${ORDER_STATUS.DRAFT}`,
                data: transactionGroup
            });
            return {
                shouldClearTransaction: true,
                orderUpdateData: {
                    orderPatches: [{
                        path: orderDotNotationMap.currentOnlineTransaction,
                        value: undefined
                    }]
                }
            };
        }
        
        // Обновление данных онлайн транзакции в заказе
        const allTransactionIds = transactionGroup.map(tx => tx.transactionId);
        const confirmTransaction = transactionGroup.find(tx => tx.confirmationUrl);

        currentOnlineTx.status = TRANSACTION_STATUS.PROCESSING;
        currentOnlineTx.transactionIds = allTransactionIds;
        if (confirmTransaction) currentOnlineTx.confirmationUrl = confirmTransaction.confirmationUrl;

        // Поиск и обработка завершённых транзакций
        const financialsEventHistory = dbOrder.financials.eventHistory;
        const initialFinancials = calculateOrderFinancials(financialsEventHistory);
        const initialNetPaid = initialFinancials.totalPaid - initialFinancials.totalRefunded;
        let finalNetPaid = initialNetPaid;
        
        const finishedTransactions = transactionGroup.filter(tx => tx.finished);

        for (const finishedTx of finishedTransactions) {
            const {
                provider, transactionType, transactionId, amount,
                originalPaymentId, markAsFailed, failureReason, createdAt
            } = finishedTx;

            // Проверка критических данных вебхука
            if (!typeCheck.string(transactionId) || !transactionId || isNaN(amount)) {
                logCriticalEvent({
                    logContext: LOG_CTX,
                    category: 'financials',
                    reason: 'Отсутствуют ключевые данные в транзакции платёжной системы',
                    data: finishedTx
                });
                continue;
            }
            
            // Проверка на дубль в истории (идемпотентность)
            const isTransactionAlreadyRecorded = checkFinancialsTransactionRecord(
                financialsEventHistory,
                transactionId
            );
            if (isTransactionAlreadyRecorded) {
                // Изъятие ID транзакции из массива в данных онлайн транзакции
                currentOnlineTx.transactionIds =
                    currentOnlineTx.transactionIds.filter(id => id !== transactionId);
                continue;
            }

            // Вычисление и установка новых значений в заказ (мутация объекта dbOrder)
            const method = transactionType === TRANSACTION_TYPE.PAYMENT
                ? PAYMENT_METHOD.CARD_ONLINE
                : REFUND_METHOD.CARD_ONLINE;

            const { newNetPaid } = applyOrderFinancials(dbOrder, {
                transactionType,
                financials: calculateOrderFinancials(financialsEventHistory), // Всегда актуальные данные
                amount,
                method,
                provider,
                transactionId,
                originalPaymentId,
                markAsFailed,
                failureReason,
                createdAt,
                actor: { name: 'SYSTEM', role: 'system' }
            });
            finalNetPaid = newNetPaid;

            // Изъятие ID транзакции из массива в данных онлайн транзакции
            currentOnlineTx.transactionIds =
                currentOnlineTx.transactionIds.filter(id => id !== transactionId);
        }

        // Сортировка истории финансов по дате изменений
        dbOrder.financials.eventHistory.sort((eventA, eventB) =>
            new Date(eventA.changedAt).getTime() - new Date(eventB.changedAt).getTime()
        );

        // Удаление данных онлайн транзакции, если массив ID транзакций в ожидании опустел
        if (!currentOnlineTx.transactionIds.length) {
            (dbOrder as TDbOrderFinal).financials.currentOnlineTransaction = undefined;
        }

        // Сохранение обновлённого заказа
        const updatedDbOrder: TDbOrderFinal = await dbOrder.save({ session });
        
        // Обновление общей суммы оплат покупателя, если заказ уже завершён
        if (dbOrder.currentStatus === ORDER_STATUS.COMPLETED) {
            const netPaidDelta = finalNetPaid - initialNetPaid;
            await updateCustomerTotalSpent(updatedDbOrder.customerId, netPaidDelta, session, LOG_CTX);
        }

        // Формирование данных для SSE-сообщения
        const orderPatches: IDotNotationPatch[] = [
            { path: orderDotNotationMap.financialsState, value: updatedDbOrder.financials.state },
            { path: orderDotNotationMap.totalPaid, value: updatedDbOrder.financials.totalPaid },
            { path: orderDotNotationMap.totalRefunded, value: updatedDbOrder.financials.totalRefunded },
            { path: orderDotNotationMap.eventHistory, value: updatedDbOrder.financials.eventHistory }
        ];
        const orderUpdateData = { orderPatches };

        return { shouldClearTransaction: false, orderUpdateData };
    });
    
    // Очистка данных онлайн транзакции
    let clearedTransactionCount = 0;

    if (shouldClearTransaction) {
        clearedTransactionCount = await clearOrderOnlineTransaction(orderId, stuckOnlineTxStatus);
    }

    // Отправка SSE-сообщения админам
    if (orderUpdateData && (!shouldClearTransaction || clearedTransactionCount > 0)) {
        const sseMessageData = { orderUpdate: { orderId, orderUpdateData } };
        sseOrderManagement.sendToAllClients(sseMessageData);
    }
};
