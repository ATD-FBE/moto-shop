import { type Request } from 'express';
import type { TDbOrderWithTx, TYooKassaExternalTx } from '@server/types/index.js';
import type {
    TCurrency,
    TTransactionType,
    TCardOnlineProvider,
    IRefundablePayment
} from '@shared/types/index.js';

export interface ICardOnlineProviderMap {
    createPayment: (params: ICreateOnlinePaymentParams) => Promise<ICreateOnlinePaymentResult>;
    createRefund: (
        refundTasks: IRefundablePayment[],
        params: ICreateOnlineRefundsParams
    ) => Promise<ICreateOnlineRefundsResult>;
    verifyWebhook: (req: Request) => boolean;
    normalizeWebhook: <T = unknown>(payload: T) => INormalizedWebhook<T> | null;
    fetchExternalTxs: (stuckDbOrders: TDbOrderWithTx[]) => Promise<TAnyExternalTx[]>;
    normalizeExternalTx: <T = TAnyExternalTx>(tx: TAnyExternalTx) => INormalizedExternalTx<T> | null;
}

export type TExternalTx<T> = T & {
    transactionType: TTransactionType;
};

export type TAnyExternalTx = TExternalTx<TYooKassaExternalTx>;

export interface ICreateOnlinePaymentParams {
    paymentToken: string;
    amount: number;
    currency: TCurrency;
    returnUrl: string;
    description: string;
    orderId: string;
    orderNumber: string;
    customerId: string;
    provider: TCardOnlineProvider;
}
export interface ICreateOnlinePaymentResult {
    paymentId: string | null;
    confirmationUrl: string | null;
    error: Error | null;
}

export interface ICreateOnlineRefundsParams {
    currency: TCurrency;
    description: string;
}
export interface ICreateOnlineRefundsResult {
    refundIds: string[];
    errors: ICreateOnlineRefundsResultError[];
}
export interface ICreateOnlineRefundsResultError {
    task: IRefundablePayment;
    error: Error;
}

export interface INormalizedWebhook<T = unknown> {
    provider: TCardOnlineProvider;
    transactionType: TTransactionType;
    transactionId: string;
    originalPaymentId?: string;
    amount: number;
    markAsFailed: boolean;
    failureReason?: string;
    createdAt: Date;
    orderId?: string;
    rawPayload: T;
}

export interface INormalizedExternalTx<T> {
    provider: TCardOnlineProvider;
    transactionType: TTransactionType;
    transactionId: string;
    originalPaymentId?: string;
    amount: number;
    finished: boolean;
    markAsFailed: boolean;
    failureReason?: string;
    confirmationUrl?: string;
    createdAt: Date;
    orderId?: string;
    rawTransaction: T;
}
