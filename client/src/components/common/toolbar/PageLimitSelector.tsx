import { logToolbarMissingProps } from '@/helpers/toolbarHelpers.js';
import type { JSX, Dispatch, SetStateAction } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface TPageLimitSelectorProps {
    limit?: number;
    setLimit?: Dispatch<SetStateAction<number>>;
    page?: number;
    setPage?: Dispatch<SetStateAction<number>>;
    totalItems?: number;
    options?: readonly number[];
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function PageLimitSelector({
    limit,
    setLimit,
    page,
    setPage,
    totalItems,
    options,
    uiBlocked = false
}: TPageLimitSelectorProps): JSX.Element | null {
    if (
        limit == null || setLimit == null || page == null ||
        setPage == null || totalItems == null || options == null
    ) {
        logToolbarMissingProps(
            'PageLimitSelector',
            { limit, setLimit, page, setPage, totalItems, options }
        );
        return null; 
    }

    const handleLimitChange = (newLimit: number): void => {
        // Корректировка страницы при выходе за новые пределы
        const newTotalPages = Math.ceil(totalItems / newLimit) || 1;
        const newPage = page > newTotalPages ? newTotalPages : page;
    
        setLimit(newLimit);
        if (newPage !== page) setPage(newPage);
    };

    return (
        <div className="page-limit-selector">
            <label htmlFor="limit">Показывать по: </label>
            
            <select
                id="limit"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.currentTarget.value))}
                disabled={uiBlocked}
            >
                {options.map(num => (
                    <option key={num} value={num}>
                        {num}
                    </option>
                ))}
            </select>
        </div>
    );
}
