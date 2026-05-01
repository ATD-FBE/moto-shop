import { useRef, useMemo, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import CategorySelection from './category-editor/CategorySelectionPanel.jsx';
import CategoryInfoPanel from './category-editor/CategoryInfoPanel.jsx';
import CategoryControlPanel from './category-editor/CategoryControlPanel.jsx';
import { getDescendantCategoryIds } from '@/helpers/categoryHelpers.js';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { sendCategoryDeleteRequest } from '@/api/categoryRequests.js';
import { pluralize } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import { UNSORTED_CATEGORY_SLUG, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { TDataLoadStatus, TCategoryPerformFormSubmissionResult } from '@/types/index.js';
import type { TCategoryTree, TCategoryMap } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICategoryEditorProps {
    setOperationBusy: Dispatch<SetStateAction<boolean>>;
    categoryTree: TCategoryTree;
    categoryMap: TCategoryMap;
    selectedCategoryId: string;
    setSelectedCategoryId: Dispatch<SetStateAction<string>>;
    loadStatus: TDataLoadStatus;
    loadCategories: () => Promise<void>;
    shouldProductsLoad: boolean;
    setShouldProductsLoad: Dispatch<SetStateAction<boolean>>;
    uiBlocked: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CategoryEditor({
    setOperationBusy,
    categoryTree,
    categoryMap,
    selectedCategoryId,
    setSelectedCategoryId,
    loadStatus,
    loadCategories,
    shouldProductsLoad,
    setShouldProductsLoad,
    uiBlocked
}: ICategoryEditorProps): JSX.Element {
    const movedProductsCountOnCategoryDeletionRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const selectedCategory = categoryMap[selectedCategoryId];

    const descendantCategoryIds = useMemo(
        () => getDescendantCategoryIds(selectedCategory),
        [selectedCategoryId, categoryMap]
    );
    const unsortedCategory = useMemo(
        () => categoryTree.find(cat => cat.slug === UNSORTED_CATEGORY_SLUG),
        [categoryTree]
    );

    const processCategoryForm = async (
        performFormSubmission: () => Promise<TCategoryPerformFormSubmissionResult | undefined>
    ): Promise<void> => {
        setOperationBusy(true);

        const responseData = await performFormSubmission();
        if (isUnmountedRef.current || !responseData) return;

        if (responseData.status === REQUEST_STATUS.SUCCESS) {
            const { finalizeSuccessHandling, newCategoryId, movedProductsCount } = responseData;

            await loadCategories();
            if (isUnmountedRef.current) return;

            finalizeSuccessHandling();
            if (newCategoryId) setSelectedCategoryId(newCategoryId);

            if (movedProductsCount > 0) {
                const товар = pluralize(movedProductsCount, ['товар', 'товара', 'товаров']);
                const находившийся = pluralize(movedProductsCount, ['находившийся', 'находившихся',
                    'находившихся']);
                const был = pluralize(movedProductsCount, ['был', 'были', 'были']);
                const перемещён = pluralize(movedProductsCount, ['перемещён', 'перемещены',
                    'перемещены']);

                openAlertModal({
                    type: 'warn',
                    dismissible: false,
                    title: 'Внимание!',
                    message:
                        `В связи с изменением структуры категорий, ` +
                        `${movedProductsCount} ${товар}, ранее ${находившийся} в категории, ` +
                        `ставшей родительской, ${был} ${перемещён} в корневую категорию ` +
                        `«${unsortedCategory?.name || NO_VALUE_LABEL}».`
                });
            }
        }

        setOperationBusy(false);
    };

    const confirmCategoryDeletion = (): void => {
        const categoryDeletionPrompt =
            `Категория товаров «${selectedCategory?.name || NO_VALUE_LABEL}» будет удалена` +
            (descendantCategoryIds.length
                ? ` вместе со всеми её подкатегориями (${descendantCategoryIds.length}):\n\n"` +
                    descendantCategoryIds
                        .map(d => categoryMap[d]?.name || NO_VALUE_LABEL)
                        .join('",\n"') +
                    '".\n\n'
                : '.\n\n') +
            `Все товары из ${descendantCategoryIds.length ? 'этих категорий' : 'этой категории'} ` +
            `будут перемещены в корневую категорию «${unsortedCategory?.name || NO_VALUE_LABEL}».\n\n` +
            'Подтвердить выполнение?'; 

        const processCategoryDeletion = async (categoryId: string): Promise<void> => {
            setOperationBusy(true);

            const responseData = await dispatch(sendCategoryDeleteRequest(categoryId));
            if (isUnmountedRef.current) return;

            const { status, message } = responseData;

            logRequestStatus({ context: 'CATEGORY: DELETE', status, message });
    
            const isAllowed = status === REQUEST_STATUS.SUCCESS || status === REQUEST_STATUS.NOT_FOUND;
            if (!isAllowed) {
                setOperationBusy(false);
                throw new Error(message);
            }
    
            if (status === REQUEST_STATUS.SUCCESS) {
                movedProductsCountOnCategoryDeletionRef.current = responseData.movedProductsCount;
            }
        };
    
        const finalizeCategoryDeletion = async (categoryId: string): Promise<void> => {
            const parentCategory = categoryMap[categoryId]?.parent || '';

            await loadCategories();
            if (isUnmountedRef.current) return;

            const movedProductsCount = movedProductsCountOnCategoryDeletionRef.current;

            if (movedProductsCount > 0) {
                const товар = pluralize(movedProductsCount, ['товар', 'товара', 'товаров']);
                const содержащийся = pluralize(movedProductsCount, ['содержащийся', 'содержащихся',
                    'содержащихся']);
                const был = pluralize(movedProductsCount, ['был', 'были', 'были']);
                const перемещён = pluralize(movedProductsCount, ['перемещён', 'перемещены',
                    'перемещены']);

                openAlertModal({
                    type: 'warn',
                    dismissible: false,
                    title: 'Внимание!',
                    message:
                        `При удалении категории или всей её ветки ${movedProductsCount} ${товар}, ` +
                        `${содержащийся} в этих категориях, ${был} ${перемещён} ` +
                        `в корневую категорию «${unsortedCategory?.name || NO_VALUE_LABEL}».`
                });

                movedProductsCountOnCategoryDeletionRef.current = 0;
            }

            setSelectedCategoryId(parentCategory);
            setOperationBusy(false);
        };

        openConfirmModal({
            prompt: categoryDeletionPrompt,
            onConfirm: () => processCategoryDeletion(selectedCategoryId),
            onFinalize: () => finalizeCategoryDeletion(selectedCategoryId)
        });
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div className="category-editor">
            <CategorySelection
                loadStatus={loadStatus}
                categoryTree={categoryTree}
                categoryMap={categoryMap}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                loadCategories={loadCategories}
                shouldProductsLoad={shouldProductsLoad}
                setShouldProductsLoad={setShouldProductsLoad}
                uiBlocked={uiBlocked}
            />

            <CategoryInfoPanel
                categoryMap={categoryMap}
                selectedCategoryId={selectedCategoryId}
            />

            <CategoryControlPanel
                categoryTree={categoryTree}
                categoryMap={categoryMap}
                selectedCategoryId={selectedCategoryId}
                processCategoryForm={processCategoryForm}
                confirmCategoryDeletion={confirmCategoryDeletion}
                uiBlocked={uiBlocked}
            />
        </div>
    );
}
