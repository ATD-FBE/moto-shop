import CustomerTableHeader from './customer-table/CustomerTableHeader.jsx';
import CustomerTableBody from './customer-table/CustomerTableBody.jsx';
import type { JSX } from 'react';
import type { TDataLoadStatus, IUpdateCustomerDiscountResult } from '@/types/index.js';
import type {
    ICustomer,
    ICustomerDiscountUpdateBody,
    ICustomerBanStatusUpdateBody
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICustomerTableProps {
    loadStatus: TDataLoadStatus;
    uiBlocked: boolean;
    customers: ICustomer[];
    filteredIds: Set<string>;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onToggleAllSelection: (areAllCustomersSelected: boolean) => void;
    onToggleSelection: (customerId: string) => void;
    onToggleExpansion: (customerId: string) => void;
    onUpdateDiscount: (
        customerId: string,
        objData: ICustomerDiscountUpdateBody
    ) => Promise<IUpdateCustomerDiscountResult | undefined>;
    onUpdateBanStatus: (customerId: string, objData: ICustomerBanStatusUpdateBody) => Promise<void>;
    onReload: () => Promise<void>;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTable({
    loadStatus,
    uiBlocked,
    customers,
    filteredIds,
    selectedIds,
    expandedIds,
    onToggleAllSelection,
    onToggleSelection,
    onToggleExpansion,
    onUpdateDiscount,
    onUpdateBanStatus,
    onReload
}: ICustomerTableProps): JSX.Element {
    return (
        <div role="table" className="entity-table customer-table">
            <CustomerTableHeader
                uiBlocked={uiBlocked}
                filteredIds={filteredIds}
                selectedIds={selectedIds}
                onToggleAllSelection={onToggleAllSelection}
            />

            <CustomerTableBody
                loadStatus={loadStatus}
                uiBlocked={uiBlocked}
                customers={customers}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onUpdateDiscount={onUpdateDiscount}
                onUpdateBanStatus={onUpdateBanStatus}
                onReload={onReload}
            />
        </div>
    );
}
