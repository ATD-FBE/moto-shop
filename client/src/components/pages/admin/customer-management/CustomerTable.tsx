import CustomerTableHeader from './customer-table/CustomerTableHeader.jsx';
import CustomerTableBody from './customer-table/CustomerTableBody.jsx';
import type { JSX } from 'react';
import type { TDataLoadStatus, IUpdateCustomerDiscountResult } from '@/types/index.js';
import type { ICustomer } from '@shared/types/index.js';

interface ICustomerTableProps {
    loadStatus: TDataLoadStatus;
    uiBlocked: boolean;
    paginatedItems: ICustomer[];
    filteredItems: Set<string>;
    selectedItems: Set<string>;
    expandedItems: Set<string>;
    toggleAllItemSelection: (areAllCustomersSelected: boolean) => void;
    toggleItemSelection: (customerId: string) => void;
    toggleItemExpansion: (customerId: string) => void;
    updateItemDiscount: (
        customerId: string,
        discount: number
    ) => Promise<IUpdateCustomerDiscountResult | undefined>;
    toggleItemBanStatus: (customerId: string, newBanStatus: boolean) => Promise<void>;
    reloadItems: () => Promise<void>;
}

export default function CustomerTable({
    loadStatus,
    uiBlocked,
    paginatedItems,
    filteredItems,
    selectedItems,
    expandedItems,
    toggleAllItemSelection,
    toggleItemSelection,
    toggleItemExpansion,
    updateItemDiscount,
    toggleItemBanStatus,
    reloadItems
}: ICustomerTableProps): JSX.Element {
    return (
        <div role="table" className="entity-table customer-table">
            <CustomerTableHeader
                uiBlocked={uiBlocked}
                filteredItems={filteredItems}
                selectedItems={selectedItems}
                toggleAllItemSelection={toggleAllItemSelection}
            />

            <CustomerTableBody
                loadStatus={loadStatus}
                uiBlocked={uiBlocked}
                paginatedItems={paginatedItems}
                selectedItems={selectedItems}
                expandedItems={expandedItems}
                toggleItemSelection={toggleItemSelection}
                toggleItemExpansion={toggleItemExpansion}
                updateItemDiscount={updateItemDiscount}
                toggleItemBanStatus={toggleItemBanStatus}
                reloadItems={reloadItems}
            />
        </div>
    );
}
