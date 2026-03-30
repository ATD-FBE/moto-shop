import type { TOrderStatus } from '@shared/types/index.js';

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

export interface IOrderTransitionResult {
    newOrderStatus: TOrderStatus;
    rollbackAllowed: boolean;
}

export interface IApplyOrderFinancialsResult {
    newNetPaid: number;
}
