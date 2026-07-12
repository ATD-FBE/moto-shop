import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { CartItem } from '../Cart.jsx';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import ProductQuantitySelector from '@/components/common/ProductQuantitySelector.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendCartItemRemoveRequest } from '@/api/cartRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/config/constants.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { formatCurrency, highlightText } from '@/helpers/textHelpers.js';
import generateSlug from '@/helpers/generateSlug.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, ComponentProps, Dispatch, SetStateAction } from 'react';
import type { ICartItemElemAnimationState } from '@/types/index.js';
import type { IProduct, ICartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CartItem>;

type TCartItemCardProps = Pick<ICartItem,
    | 'id'
    | 'quantity'
    | 'quantityReduced'
    | 'outOfStock'
    | 'inactive'
> & Pick<IProduct,
    | 'images'
    | 'mainImageIndex'
    | 'sku'
    | 'available'
    | 'unit'
    | 'price'
> & Pick<TParentProps,
    | 'pricesElemRef'
    | 'totalsElemRef'
    | 'maxPricesWidth'
    | 'maxTotalsWidth'
    | 'searchQuery'
    | 'cartClearing'
    | 'isTouchDevice'
    | 'isAuthenticated'
    | 'addCartItemInProgress'
    | 'removeCartItemInProgress'
    | 'checkoutInProgress'
> & {
    title: string;
    productDiscount: number;
    customerDiscount: number;
    isPendingRemoval: boolean;
    setIsPendingRemoval: Dispatch<SetStateAction<boolean>>;
    isAnimationActive: boolean;
    setAnimationState: (updater: ICartItemElemAnimationState) => void;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CartItemCard({
    id,
    images,
    mainImageIndex,
    sku,
    title,
    available,
    unit,
    price,
    productDiscount,
    customerDiscount,
    quantity,
    quantityReduced,
    outOfStock,
    inactive,
    pricesElemRef,
    totalsElemRef,
    maxPricesWidth,
    maxTotalsWidth,
    searchQuery,
    cartClearing,
    isTouchDevice,
    isAuthenticated,
    addCartItemInProgress,
    removeCartItemInProgress,
    checkoutInProgress,
    isPendingRemoval,
    setIsPendingRemoval,
    isAnimationActive,
    setAnimationState
}: TCartItemCardProps): JSX.Element {
    const [upserting, setUpserting] = useState(false);
    const [removing, setRemoving] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const slug = generateSlug(title);
    const productUrl = routeConfig.productDetails.generatePath({ productId: id, slug, sku });

    const hasImages = images.length > 0;
    const mainImage = hasImages ? images[mainImageIndex ?? 0] ?? images[0] : null;
    const thumbImageSrc = mainImage?.thumbnails.small ?? PRODUCT_IMAGE_PLACEHOLDER;
    const thumbImageAlt = hasImages ? title : '';

    const effectiveDiscount = Math.max(productDiscount, customerDiscount);
    const hasDiscount = effectiveDiscount > 0;
    const currentPrice = hasDiscount ? price * (1 - effectiveDiscount / 100) : price;
    const originalTotal = price * quantity;
    const currentTotal = currentPrice * quantity;
    const savedTotal = originalTotal - currentTotal;

    const formattedOriginalPrice = formatCurrency(price);
    const formattedCurrentPrice = formatCurrency(currentPrice)
    const formattedOriginalTotal = formatCurrency(originalTotal);
    const formattedCurrentTotal = formatCurrency(currentTotal)
    const formattedSavedTotal = formatCurrency(savedTotal);

    const isUnavailable =
        isAnimationActive ||
        removing ||
        isPendingRemoval ||
        cartClearing ||
        checkoutInProgress;
    const isCartItemUiBlocked = upserting || isUnavailable;

    const handleRemove = async (): Promise<void> => {
        setRemoving(true);
        addCartItemInProgress(id);

        const { status, message } = await dispatch(sendCartItemRemoveRequest(id));
        if (isUnmountedRef.current) return;

        logRequestStatus({ context: 'CART: REMOVE ITEM', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            dispatch(openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось удалить товар из корзины',
                message: 'Ошибка при удалении товара.\nПодробности ошибки в консоли.'
            }));
        } else {
            setIsPendingRemoval(true);
            setAnimationState({ active: true, reason: 'pendingRemoval', phase: 'transitioning' });
        }

        setRemoving(false);
        removeCartItemInProgress(id);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <article
            data-id={id}
            data-message={removing ? '⏳ Удаление товара из корзины...' : ''}
            className={cn('cart-item-card', {
                'unavailable': isUnavailable,
                'quantity-reduced': quantityReduced,
                'out-of-stock': outOfStock,
                'inactive': inactive
            })}
        >
            <div className="product-thumb">
                <BlockableLink to={productUrl}>
                    <TrackedImage
                        className="product-thumb-img"
                        src={thumbImageSrc}
                        alt={thumbImageAlt}
                    />
                </BlockableLink>
            </div>

            <div className="product-info">
                <h4 className="product-title">
                    <BlockableLink to={productUrl}>
                        {highlightText(title, searchQuery)}
                    </BlockableLink>
                </h4>
                {sku && (
                    <p className="product-info-item">
                        <span className="label">Артикул:</span>
                        <span className="value">
                            {highlightText(sku, searchQuery)}
                        </span>
                    </p>
                )}
                {hasDiscount && (
                    <p className="product-info-item">
                        <span className="label">Применённая скидка:</span>
                        <span className="value">
                            {effectiveDiscount}%
                            {productDiscount > customerDiscount
                                ? ' (скидка на товар)'
                                : ' (клиентская скидка)'}
                        </span>
                    </p>
                )}
            </div>

            <div className="product-prices" style={{ minWidth: maxPricesWidth || 'auto' }}>
                <div ref={pricesElemRef} className="measured-content">
                    {hasDiscount && (
                        <p className="original-price">{formattedOriginalPrice} руб.</p>
                    )}
                    <p className="current-price">{formattedCurrentPrice} руб.</p>
                    <p className="unit-info">(цена за 1 {unit})</p>
                </div>
            </div>

            <div className="math-symbol multiply">×</div>

            {outOfStock ? (
                <div className="out-of-stock">
                    <p className="stock-info">
                        <span className="icon">❌</span>
                        Нет в наличии
                    </p>
                    <p className="quantity-info">
                        {'В корзине: '}
                        <span className="quantity-unit">
                            <span className="quantity">{quantity}</span>
                            {` ${unit}`}
                        </span>
                    </p>
                </div>
            ) : inactive ? (
                <div className="inactive">
                    <p className="stock-info">
                        <span className="icon">🔒</span>
                        Не продаётся
                    </p>
                    <p className="quantity-info">
                        {'В корзине: '}
                        <span className="quantity-unit">
                            <span className="quantity">{quantity}</span>
                            {` ${unit}`}
                        </span>
                    </p>
                </div>
            ) : (
                <ProductQuantitySelector
                    productId={id}
                    availableQuantity={available}
                    orderedQuantity={quantity}
                    quantityReduced={quantityReduced}
                    isTouchDevice={isTouchDevice}
                    isAuthenticated={isAuthenticated}
                    uiBlocked={isCartItemUiBlocked}
                    minQuantity={1}
                    onLoading={setUpserting}
                />
            )}

            <div className="math-symbol equal">=</div>

            <div className="product-total-amounts" style={{ minWidth: maxTotalsWidth || 'auto' }}>
                <div ref={totalsElemRef} className="measured-content">
                    {hasDiscount && (
                        <p className="product-original-total">{formattedOriginalTotal} руб.</p>
                    )}
                    <p className="product-current-total">{formattedCurrentTotal} руб.</p>
                    {hasDiscount && (
                        <p className="product-saved-total">Экономия: {formattedSavedTotal} руб.</p>
                    )}
                </div>
            </div>

            <div className="remove-product-box">
                <button
                    className="remove-product-btn"
                    onClick={handleRemove}
                    disabled={isCartItemUiBlocked}
                    aria-label="Удалить товар из корзины"
                >
                    ❌
                </button>
            </div>
        </article>
    );
}
