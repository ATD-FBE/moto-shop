import { Types } from 'mongoose';
import type {
    TUserRole,
    TTransactionType,
    TPaymentMethod,
    TRefundMethod,
    TBankProvider,
    TCardOnlineProvider,
} from '@shared/types/index.js';

export interface IInvoiceDefinition {
    pageSize?: string;
    pageMargins?: [number, number, number, number];
    defaultStyle?: Record<string, any>;
    styles?: Record<string, any>;
    content: any[];
    footer?: (currentPage: number, pageCount: number) => any;
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
    actor: { _id?: Types.ObjectId; name: string; role: TUserRole };
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
