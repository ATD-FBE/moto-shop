import { Types, startSession } from 'mongoose';
import type { ClientSession } from 'mongoose';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TTransactionHandler<T> = (session: ClientSession) => Promise<T>;

type TTransactionOptions = Parameters<ClientSession['withTransaction']>[1];

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const runInDbTransaction = async <T>(
    handler: TTransactionHandler<T>,
    options: TTransactionOptions = {}
): Promise<T> => {
    // Создание сессии транзакции
    const session = await startSession();

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

export const getPopulatedDbField = (
    field: Types.ObjectId | Record<string, any> | null | undefined,
    key: string,
    fallback: string = 'Not populated'
): string => {
    if (field && !(field instanceof Types.ObjectId) && key in field) {
        return String(field[key]);
    }
    return fallback;
};
