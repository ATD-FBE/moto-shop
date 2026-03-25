import type {
    TPaymentMethod,
    TRefundMethod,
    TBankProvider,
    TCardOnlineProvider,
    TFinancialsEvent
} from './constants.types.js';
import type { IDataChange } from './shared.types.js';

/// Order ///
export interface IOrderDataChange extends IDataChange {
    currency?: boolean;
}

/// Finansials ///
export interface IFinancialsEventAction {
    method: TPaymentMethod | TRefundMethod;
    amount: number;
    provider?: TBankProvider | TCardOnlineProvider;
    transactionId?: string;
    originalPaymentId?: string;
    failureReason?: string;
    externalReference?: string;
}

export interface IFinancialsEventVoided {
    flag: boolean;
    note?: string;
    changedBy: {
        id: string;
        name: string;
        role: string;
    };
    changedAt: Date;
}

export interface IFinancialsEventEntry {
    eventId: string;
    event: TFinancialsEvent;
    action: IFinancialsEventAction;
    changedBy: {
        id?: string;
        name: string;
        role: string;
    };
    changedAt: Date;
    voided?: IFinancialsEventVoided;
}

export interface IFinancialsEventEntrySummary {
    event: string;
    action: { amount: number };
    changedAt: Date;
}
