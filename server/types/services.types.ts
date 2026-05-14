import { Types } from 'mongoose';
import type { Request } from 'express';
import type { Payment, Refund } from '@a2seven/yoo-checkout';
import type { TDbOrderFinalItem, TDbOrderWithTx } from './db.types.js';
import type {
    TCurrency,
    TTransactionType,
    TCardOnlineProvider,
    IRefundablePayment,
    TUserRole,
    TPaymentMethod,
    TRefundMethod,
    TBankProvider
} from '@shared/types/index.js';

/////////////////////
/// ORDER SERVICE ///
/////////////////////

export interface IInvoiceDefinition {
    pageSize?: string;
    pageMargins?: [number, number, number, number];
    defaultStyle?: Record<string, any>;
    styles?: Record<string, any>;
    content: any[];
    footer?: (currentPage: number, pagesCount: number) => any;
    header?: any;
}
export type TFonts = Record<string, {
    normal: string;
    bold?: string;
    italics?: string;
    bolditalics?: string
}>;

export interface IOrderInvoiceResult {
    pdfDoc: PDFKit.PDFDocument;
    filename: string;
}

export interface IApplyOrderFinancialsParams {
    transactionType: TTransactionType;
    financials: ICalculateOrderFinancialsResult;
    amount: number;
    method: TPaymentMethod | TRefundMethod;
    provider: TBankProvider | TCardOnlineProvider;
    transactionId?: string;
    originalPaymentId?: string;
    markAsFailed: boolean;
    failureReason?: string;
    externalReference?: string;
    actor: {
        _id?: Types.ObjectId;
        name: string;
        role: TUserRole
    };
    createdAt?: Date;
}
export interface IApplyOrderFinancialsResult {
    newNetPaid: number;
}

export interface ICalculateOrderFinancialsResult {
    totalPaid: number;
    totalRefunded: number;
}

export interface IOrderItemRef {
    productId: string | Types.ObjectId;
    quantity: number;
}
///////////////////////
/// STORAGE SERVICE ///
///////////////////////

export interface TStorageProvider {
    initStorage: () => Promise<void>;
    deleteTempFiles: (
        tempFiles: Express.Multer.File | Express.Multer.File[],
        reqCtx: string
    ) => Promise<void>;
    savePromoImage: (promoId: string, tempFile: Express.Multer.File) => Promise<void>;
    deletePromoImage: (promoId: string, filename: string | null, reqCtx: string) => Promise<void>;
    cleanupPromoFiles: (promoId: string | null, reqCtx: string) => Promise<void>;
    saveProductImages: (productId: string, tempFiles: Express.Multer.File[]) => Promise<void>;
    deleteProductImages: (productId: string, filenames: string[], reqCtx: string) => Promise<void>;
    cleanupProductFiles: (productId: string | null, reqCtx: string) => Promise<void>;
    saveOrderItemsImages: (orderId: string, orderItems: TDbOrderFinalItem[]) => Promise<void>;
    deleteOrderItemsImages: (orderId: string, filenames: string[], reqCtx: string) => Promise<void>;
    cleanupOrderFiles: (orderId: string | null, reqCtx: string) => Promise<void>;
}

///////////////////////////////////
/// ONLINE TRANSACTIONS SERVICE ///
///////////////////////////////////

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

/////////////////////////////////////////////////
/// ONLINE TRANSACTIONS: PROVIDERS - YOOKASSA ///
/////////////////////////////////////////////////

export interface IYooKassaWebhook {
    type: 'notification';
    event: 'payment.waiting_for_capture' | 'payment.succeeded' | 'payment.canceled' | 'refund.succeeded';
    object: Payment | Refund;
}

export type TYooKassaExternalTx = Payment | Refund;

export interface IYooKassaTxListResponse<T> {
    type: 'list';
    items: T[];
    next_cursor?: string;
}
