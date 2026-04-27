import { useState, useEffect } from 'react';
import cn from 'classnames';
import { logToolbarMissingProps } from '@/helpers/toolbarHelpers.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type {  } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface TPaginationPagesProps {
    currentPage?: number;
    totalItems?: number;
    limit?: number;
    setPage?: Dispatch<SetStateAction<number>>;
    initDataReady?: boolean;
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const NEIGHBOR_PAGES = 2; // Количество соседних страниц слева и справа от текущей
const EDGE_PAGES = 2; // Количество страниц по краям
const ELLIPSIS = '...'; // Элемент для пропуска страницы

export default function PaginationPages({
    currentPage,
    totalItems,
    limit,
    setPage,
    initDataReady = false,
    uiBlocked = false
}: TPaginationPagesProps): JSX.Element | null {
    if (currentPage == null || totalItems == null || limit == null || setPage == null) {
        logToolbarMissingProps('SortingControls', { currentPage, totalItems, limit, setPage });
        return null; 
    }

    const [selectedPage, setSelectedPage] = useState(currentPage);

    // Генерация диапазона для пагинации
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const pageNumbers: (number | typeof ELLIPSIS)[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (
            i <= EDGE_PAGES ||
            i > totalPages - EDGE_PAGES ||
            (i >= currentPage - NEIGHBOR_PAGES && i <= currentPage + NEIGHBOR_PAGES)
        ) {
            pageNumbers.push(i);
        } else if (pageNumbers[pageNumbers.length - 1] !== ELLIPSIS) {
            pageNumbers.push(ELLIPSIS);
        }
    }

    // Установка выбранной страницы
    useEffect(() => {
        setSelectedPage(currentPage);
    }, [currentPage]);

    // Сброс страницы при превышении общего количества страниц
    // (данные не найдены, удаление последнего элемента с последней страницы)
    useEffect(() => {
        if (initDataReady && currentPage > totalPages) {
            setPage(totalPages);
        }
    }, [initDataReady, currentPage, totalPages]);

    return (
        <div className="pagination-pages">
            <div className="page-controls-box">
                <button
                    className="page-step-btn"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={uiBlocked || currentPage <= 1}
                    aria-label={'Перейти на предыдущую страницу'}
                >
                    ⮜
                </button>

                {pageNumbers.map((page, idx) => (
                    page === ELLIPSIS ? (
                        <span
                            key={idx}
                            className={cn('ellipsis', uiBlocked ? 'inactive' : '')}
                        >
                            {ELLIPSIS}
                        </span>
                    ) : (
                        <button
                            key={idx}
                            className={cn(
                                'page-number-btn',
                                page === currentPage ? 'page-current-btn' : null
                            )}
                            onClick={() => setPage(page)}
                            disabled={uiBlocked || page === currentPage}
                            aria-label={`Перейти на страницу ${page}`}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    className="page-step-btn"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={uiBlocked || currentPage >= totalPages}
                    aria-label={'Перейти на следующую страницу'}
                >
                    ⮞
                </button>
            </div>

            <div className="select-page-box">
                <label>
                    На страницу:
                    <input
                        type="number"
                        className="select-page-input"
                        value={selectedPage}
                        min="1"
                        max={totalPages}
                        onChange={(e) => setSelectedPage(Number(e.currentTarget.value))}
                        onBlur={() => {
                            if (selectedPage < 1) setSelectedPage(1);
                            if (selectedPage > totalPages) setSelectedPage(totalPages);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const newSelectedPage = Number(e.currentTarget.value);

                                if (
                                    newSelectedPage !== currentPage &&
                                    newSelectedPage >= 1 &&
                                    newSelectedPage <= totalPages
                                ) {
                                    setPage(newSelectedPage);
                                }
                            }
                        }}
                        disabled={uiBlocked}
                    />
                </label>
                
                <button
                    className="select-page-btn"
                    onClick={() => setPage(selectedPage)}
                    disabled={
                        uiBlocked ||
                        selectedPage === currentPage ||
                        selectedPage < 1 ||
                        selectedPage > totalPages
                    }
                    aria-label={'Перейти на выбранную страницу'}
                >
                    Перейти
                </button>
            </div>
        </div>
    );
}
