import { useMemo } from 'react';
import CustomerTable from '../CustomerTable.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CustomerTable>;

type TCustomerTableHeaderProps = Pick<TParentProps,
    | 'uiBlocked'
    | 'filteredIds'
    | 'selectedIds'
    | 'onToggleAllSelection'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableHeader({
    uiBlocked,
    filteredIds,
    selectedIds,
    onToggleAllSelection
}: TCustomerTableHeaderProps): JSX.Element {
    const areAllItemsSelected = useMemo(
        () => filteredIds.size > 0 && selectedIds.size === filteredIds.size,
        [selectedIds, filteredIds]
    );
    const areSomeItemsSelected = useMemo(
        () => selectedIds.size > 0 && !areAllItemsSelected,
        [selectedIds, areAllItemsSelected]
    );

    return (
        <div role="rowgroup" className="table-header">
            <div role="row">
                <div role="columnheader" className="row-cell visible select">
                    <div className="cell-label">Выбрать всех:</div>
                    <div className="cell-content">
                        <DesignedCheckbox
                            checkIcon={areAllItemsSelected ? '✅' : areSomeItemsSelected ? '⬛' : '⬜'}
                            checked={areAllItemsSelected || areSomeItemsSelected}
                            onChange={() => onToggleAllSelection(areAllItemsSelected)}
                            disabled={uiBlocked}
                        />
                    </div>
                </div>
                <div role="columnheader" className="row-cell id">ID</div>
                <div role="columnheader" className="row-cell name">Имя</div>
                <div role="columnheader" className="row-cell email">Email</div>
                <div role="columnheader" className="row-cell reg-date">Дата регистрации</div>
                <div role="columnheader" className="row-cell discount">Скидка</div>
                <div role="columnheader" className="row-cell total-spent">Сумма покупок</div>
                <div role="columnheader" className="row-cell orders">Заказы</div>
                <div role="columnheader" className="row-cell ban">Блокировка</div>
            </div>
        </div>
    );
}
