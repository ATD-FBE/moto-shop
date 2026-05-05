import { useMemo } from 'react';
import ProductTable from '../ProductTable.js';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductTable>;

type TProductTableHeaderProps = Pick<TParentProps,
    | 'filteredIds'
    | 'selectedIds'
    | 'onToggleAllSelection'
    | 'uiBlocked'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTableHeader({
    filteredIds,
    selectedIds,
    onToggleAllSelection,
    uiBlocked
}: TProductTableHeaderProps): JSX.Element {
    const areAllItemsSelected = useMemo(
        () => filteredIds.size > 0 && selectedIds.size === filteredIds.size,
        [filteredIds, selectedIds]
    );
    const areSomeItemsSelected = useMemo(
        () => selectedIds.size > 0 && !areAllItemsSelected,
        [selectedIds, areAllItemsSelected]
    );

    return (
        <div role="rowgroup" className="table-header">
            <div role="row">
                <div role="columnheader" className="row-cell visible select">
                    <div className="cell-label">Выбрать все:</div>
                    <div className="cell-content">
                        <DesignedCheckbox
                            checkIcon={areAllItemsSelected ? '✅' : areSomeItemsSelected ? '⬛' : '⬜'}
                            checked={areAllItemsSelected || areSomeItemsSelected}
                            onChange={() => onToggleAllSelection(areAllItemsSelected)}
                            disabled={uiBlocked}
                        />
                    </div>
                </div>
                <div role="columnheader" className="row-cell thumb-link">Фото / Ссылка</div>
                <div role="columnheader" className="row-cell id-sku">ID / Артикул</div>
                <div role="columnheader" className="row-cell name-brand">Наименование / Бренд</div>
                <div role="columnheader" className="row-cell description">Описание</div>
                <div role="columnheader" className="row-cell stock-unit">Количество</div>
                <div role="columnheader" className="row-cell price-discount">Цена / Уценка</div>
                <div role="columnheader" className="row-cell category">Категория</div>
                <div role="columnheader" className="row-cell tags">Теги</div>
                <div role="columnheader" className="row-cell edit">Редактирование</div>
                <div role="columnheader" className="row-cell delete">Удаление</div>
            </div>
        </div>
    );
}
