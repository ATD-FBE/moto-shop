import mongoose, { mongo } from 'mongoose';
import type { TTransactionHandler } from '@server/types/index.js';

export async function runInTransaction<T>(
    handler: TTransactionHandler<T>,
    options: mongo.TransactionOptions = {}
): Promise<T> {
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
}
