import { ClientSession } from 'mongoose';

export type TTransactionHandler<T> = (session: ClientSession) => Promise<T>;

export type TTransactionOptions = Parameters<ClientSession['withTransaction']>[1];
