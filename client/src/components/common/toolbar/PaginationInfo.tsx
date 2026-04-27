import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { logToolbarMissingProps } from '@/helpers/toolbarHelpers.js';
import type { JSX } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface TPaginationInfoProps {
    loadStatus?: TDataLoadStatus;
    page?: number;
    limit?: number;
    totalItems?: number;
    label?: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function PaginationInfo({
    loadStatus,
    page,
    limit,
    totalItems,
    label
}: TPaginationInfoProps): JSX.Element | null {
    if (loadStatus == null || page == null || limit == null || totalItems == null || label == null) {
        logToolbarMissingProps('SortingControls', { loadStatus, page, limit, totalItems, label });
        return null; 
    }

    let resultsInfo = '';

    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        resultsInfo = 'Данные загружаются...';
    } else if (loadStatus === DATA_LOAD_STATUS.SKIPPED || loadStatus === DATA_LOAD_STATUS.ERROR) {
        resultsInfo = 'Нет данных';
    } else if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        resultsInfo = '0';
    } else {
        const firstItemIdxOnPage = (page - 1) * limit + 1;
        const lastItemIdxOnPage = Math.min(firstItemIdxOnPage + limit - 1, totalItems);

        const itemsRangeOnPage = lastItemIdxOnPage > firstItemIdxOnPage
            ? `${firstItemIdxOnPage} - ${lastItemIdxOnPage}`
            : `${firstItemIdxOnPage}`;

        resultsInfo = `${itemsRangeOnPage} из ${totalItems}`;
    }

    return (
        <div className="pagination-info">
            <p>{label}: {resultsInfo}</p>
        </div>
    );
}
