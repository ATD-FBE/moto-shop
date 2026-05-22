import { useRef, useMemo, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import Toolbar from '@/components/common/Toolbar.jsx';
import ProductTable from './product-editor/ProductTable.jsx';
import ProductCreationPanel from './product-editor/ProductCreationPanel.jsx';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { getLeafCategories } from '@/helpers/categoryHelpers.js';
import { sendProductDeleteRequest, sendBulkProductDeleteRequest } from '@/api/productRequests.js';
import { upsertProductsInStore, removeProductsFromStore } from '@/redux/slices/productsSlice.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type {
    TDataLoadStatus,
    TProductPerformFormSubmission,
    IDeletingProduct
} from '@/types/index.js';
import type {
    IProduct,
    TFilterParamsClient,
    TFilterOption,
    ISortOption,
    TCategoryTree
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductEditorProps {
    categoryTree: TCategoryTree;
    setOperationBusy: Dispatch<SetStateAction<boolean>>;
    shouldProductsLoad: boolean;
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    filter: TFilterParamsClient;
    setFilter: Dispatch<SetStateAction<TFilterParamsClient>>;
    filterOptions?: readonly TFilterOption[];
    sort: string;
    setSort: Dispatch<SetStateAction<string>>;
    sortOptions: readonly ISortOption[];
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
    limit: number;
    setLimit: Dispatch<SetStateAction<number>>;
    limitOptions: readonly number[];
    initDataReady: boolean;
    loadStatus: TDataLoadStatus;
    onReload: () => Promise<void>;
    products: IProduct[];
    filteredIds: Set<string>;
    selectedIds: Set<string>;
    expandedIds: Set<string>;
    onToggleAllSelection: (areAllProductsSelected: boolean) => void;
    onToggleSelection: (id: string) => void;
    onToggleExpansion: (id: string) => void;
    uiBlocked: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function ProductEditor({
    categoryTree,
    setOperationBusy,
    shouldProductsLoad,
    search,
    setSearch,
    filter,
    setFilter,
    filterOptions,
    sort,
    setSort,
    sortOptions,
    page,
    setPage,
    limit,
    setLimit,
    limitOptions,
    initDataReady,
    loadStatus,
    onReload,
    products,
    filteredIds,
    selectedIds,
    expandedIds,
    onToggleAllSelection,
    onToggleSelection,
    onToggleExpansion,
    uiBlocked
}: IProductEditorProps): JSX.Element {
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const productLeafCategories = useMemo(() => getLeafCategories(categoryTree), [categoryTree]);

    const processProductForm = async (
        performFormSubmission: TProductPerformFormSubmission
    ): Promise<void> => {
        setOperationBusy(true);

        const responseData = await performFormSubmission();
        if (isUnmountedRef.current || !responseData) return;

        if (
            responseData.status === REQUEST_STATUS.SUCCESS ||
            responseData.status === REQUEST_STATUS.PARTIAL
        ) {
            dispatch(upsertProductsInStore(responseData.affectedProducts));

            if (shouldProductsLoad) {
                await onReload();
                if (isUnmountedRef.current) return;
            }
        }

        setOperationBusy(false);
    };

    const confirmProductDeletion = (product: IDeletingProduct): void => {
        if (!product) return;

        const processProductDeletion = async (productId: string): Promise<void> => {
            setOperationBusy(true);

            const { status, message } = await dispatch(sendProductDeleteRequest(productId));
            if (isUnmountedRef.current) return;
    
            logRequestStatus({ context: 'PRODUCT: DELETE SINGLE', status, message });
    
            const { SUCCESS, NOT_FOUND } = REQUEST_STATUS;
            const isAllowed = [SUCCESS, NOT_FOUND].some(s => s === status);

            if (!isAllowed) {
                setOperationBusy(false);
                throw new Error(message);
            }

            dispatch(removeProductsFromStore([productId]));
        };

        const finalizeProductDeletion = async (): Promise<void> => {
            if (shouldProductsLoad) {
                await onReload();
                if (isUnmountedRef.current) return;
            }

            setOperationBusy(false);
        };

        openConfirmModal({
            prompt: `Товар «${product.name}» будет удалён.\n\nПодтвердить выполнение?`,
            onConfirm: () => processProductDeletion(product.id),
            onFinalize: finalizeProductDeletion
        });
    };

    const confirmBulkProductDeletion = (productIds: string[]): void => {
        if (!productIds || !productIds.length) return;

        const processBulkProductDeletions = async (productIds: string[]): Promise<void> => {
            setOperationBusy(true);

            const { status, message } = await dispatch(sendBulkProductDeleteRequest({ productIds }));
            if (isUnmountedRef.current) return;
            
            logRequestStatus({ context: 'PRODUCT: DELETE BULK', status, message });
    
            const { SUCCESS, PARTIAL, NOT_FOUND } = REQUEST_STATUS;
            const isAllowed = [SUCCESS, PARTIAL, NOT_FOUND].some(s => s === status);

            if (!isAllowed) {
                setOperationBusy(false);
                throw new Error(message);
            }
    
            dispatch(removeProductsFromStore(productIds));
        };

        const finalizeBulkProductDeletion = async (): Promise<void> => {
            if (shouldProductsLoad) {
                await onReload();
                if (isUnmountedRef.current) return;
            }

            setOperationBusy(false);
        };

        openConfirmModal({
            prompt: 'Выбранные товары будут удалены.\n\nПодтвердить выполнение?',
            onConfirm: () => processBulkProductDeletions(productIds),
            onFinalize: finalizeBulkProductDeletion
        });
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div className="product-editor">
            <ProductCreationPanel
                uiBlocked={uiBlocked}
                allowedCategories={productLeafCategories}
                onProcessProduct={processProductForm}
            />

            <div className="product-table-section">
                <Toolbar
                    position="top"
                    activeControls={['limit', 'sort', 'search', 'filter', 'pages']}
                    search={search}
                    setSearch={setSearch}
                    searchPlaceholder="По ID, артикулу, наименованию, бренду или тегам товара"
                    filter={filter}
                    setFilter={setFilter}
                    filterOptions={filterOptions}
                    sort={sort}
                    setSort={setSort}
                    sortOptions={sortOptions}
                    page={page}
                    setPage={setPage}
                    limit={limit}
                    setLimit={setLimit}
                    limitOptions={limitOptions}
                    initDataReady={initDataReady}
                    totalItems={filteredIds.size}
                    uiBlocked={uiBlocked}
                />

                <ProductTable
                    loadStatus={loadStatus}
                    products={products}
                    allowedCategories={productLeafCategories}
                    filteredIds={filteredIds}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleAllSelection={onToggleAllSelection}
                    onToggleSelection={onToggleSelection}
                    onToggleExpansion={onToggleExpansion}
                    onConfirmDeletion={confirmProductDeletion}
                    onConfirmBulkDeletion={confirmBulkProductDeletion}
                    onReload={onReload}
                    onProcessProduct={processProductForm}
                    onProcessBulkProduct={processProductForm}
                    uiBlocked={uiBlocked}
                />
                
                <Toolbar
                    position="bottom"
                    activeControls={['info', 'pages']}
                    page={page}
                    setPage={setPage}
                    limit={limit}
                    loadStatus={loadStatus}
                    initDataReady={initDataReady}
                    totalItems={filteredIds.size}
                    label="Товары"
                    uiBlocked={uiBlocked}
                />
            </div>
        </div>
    );
}
