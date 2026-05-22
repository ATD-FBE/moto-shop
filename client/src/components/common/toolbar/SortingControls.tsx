import { useState, useEffect } from 'react';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { logMissingProps } from '@/helpers/logHelpers.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { ISortOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface TSortingControlsProps {
    sort?: string;
    setSort?: Dispatch<SetStateAction<string>>;
    options?: readonly ISortOption[];
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function SortingControls({
    sort,
    setSort,
    options,
    uiBlocked = false
}: TSortingControlsProps): JSX.Element | null {
    if (sort == null || setSort == null || options == null) {
        logMissingProps('SortingControls', { sort, setSort, options });
        return null; 
    }

    const [sortField, setSortField] = useState(sort.startsWith('-') ? sort.slice(1) : sort);
    const [isDescending, setIsDescending] = useState(sort.startsWith('-'));

    const handleSortFieldChange = (field: string): void => {
        const option = options.find(opt => opt.dbField === field);
        const isDesc = option ? option.defaultOrder === 'desc' : isDescending;
    
        setSortField(field);
        setIsDescending(isDesc);
    };

    // Установка полной строки сортировки через внешний сеттер
    useEffect(() => {
        const newSort = (isDescending ? '-' : '') + sortField;
        if (newSort !== sort) setSort(newSort);
    }, [sortField, isDescending]);

    return (
        <div className="sorting-controls">
            <div className="sort-options">
                <label htmlFor="sort" className="sort-label">Сортировка: </label>
                
                <select
                    id="sort"
                    value={sortField}
                    onChange={(e) => handleSortFieldChange(e.currentTarget.value)}
                    disabled={uiBlocked}
                >
                    {options.map(({ dbField, label }, idx) => (
                        <option key={idx} value={dbField}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="sort-descending">
                <DesignedCheckbox
                    label="По убыванию"
                    checked={isDescending}
                    onChange={(e) => setIsDescending(e.currentTarget.checked)}
                    disabled={uiBlocked}
                />
            </div>
        </div>
    );
}
