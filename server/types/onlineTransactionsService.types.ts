import type {  } from '@server/types/index.js';
import type { TCurrency, TCardOnlineProvider, IRefundablePayment } from '@shared/types/index.js';

export interface ICardOnlineProviderMap {
    createPayment: Function;
    createRefund: Function;
    verifyWebhook: Function;
    normalizeWebhook: Function;
    fetchExternal: Function;
    normalizeExternal: Function;
}

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
