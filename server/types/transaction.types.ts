import { ClientSession } from 'mongoose';

export type TTransactionHandler<T> = (session: ClientSession) => Promise<T>;
