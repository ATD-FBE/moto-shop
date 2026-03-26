import mongoose from 'mongoose';
import type { TTransactionHandler, TTransactionOptions } from '@server/types/index.js';

export const runInTransaction = async <T>(
    handler: TTransactionHandler<T>,
    options: TTransactionOptions = {}
): Promise<T> => {
    // Создание сессии транзакции
    const session = await mongoose.startSession();

    try {
        // Начало транзакции
        const result = await session.withTransaction(async () => {
            return await handler(session);
        }, options);

        return result;
    } finally {
        // Конец транзакции
        await session.endSession();
    }
};
