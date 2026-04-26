import { useState } from 'react';
import CustomerTableBody from '../CustomerTableBody.jsx';
import CustomerTableRowMain from './customer-table-row/CustomerTableRowMain.jsx';
import CustomerTableRowExpansion from './customer-table-row/CustomerTableRowExpansion.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import type { JSX, ComponentProps } from 'react';
import type { ICustomer } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CustomerTableBody>;

type TCustomerTableRowProps = Pick<TParentProps,
    | 'uiBlocked'
    | 'selectedIds'
    | 'expandedIds'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onUpdateDiscount'
    | 'onUpdateBanStatus'
> & {
    customer: ICustomer
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableRow({
    customer,
    uiBlocked,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onUpdateDiscount,
    onUpdateBanStatus
}: TCustomerTableRowProps): JSX.Element {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const isHovered = hoveredItem === customer.id;
    const isSelected = selectedIds.has(customer.id);
    const isExpanded = expandedIds.has(customer.id);

    return (
        <div
            className="table-row"
            onMouseEnter={() => setHoveredItem(customer.id)}
            onMouseLeave={() => setHoveredItem(null)}
        >
            <CustomerTableRowMain
                customer={customer}
                uiBlocked={uiBlocked}
                isHovered={isHovered}
                isSelected={isSelected}
                isExpanded={isExpanded}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onUpdateDiscount={onUpdateDiscount}
                onUpdateBanStatus={onUpdateBanStatus}
            />

            <Collapsible isExpanded={isExpanded} className="table-row-expansion-collapsible">
                <CustomerTableRowExpansion
                    customerId={customer.id}
                    customerName={customer.name}
                    isExpanded={isExpanded}
                />
            </Collapsible>
        </div>
    );
}
