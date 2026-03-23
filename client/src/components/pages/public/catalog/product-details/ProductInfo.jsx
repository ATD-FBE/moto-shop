import { useSelector } from 'react-redux';
import ProductQuantitySelector from '@/components/common/ProductQuantitySelector.jsx';
import { formatCurrency } from '@/helpers/textHelpers.js';
import { NO_VALUE_LABEL } from '@/config/constants.js';

export default function ProductInfo({
    id,
    sku,
    name,
    brand,
    description,
    available,
    unit,
    price,
    productDiscount,
    customerDiscount,
    isRestocked,
    isActive,
    isTouchDevice,
    userRole,
    isAuthenticated,
    uiBlocked
}) {
    const cartState = useSelector(state => state.cart);

    const cartItem = cartState.byId[id];
    const quantity = cartItem?.quantity ?? 0;
    const quantityReduced = cartItem?.quantityReduced ?? false;

    const showCartControls =
        ['guest', 'customer'].includes(userRole) &&
        cartState.isAccessible &&
        available > 0 &&
        isActive;

    const effectiveDiscount = Math.max(productDiscount, customerDiscount);
    const hasDiscount = effectiveDiscount > 0;
    const currentPrice = hasDiscount ? price * (1 - effectiveDiscount / 100) : price;

    const formattedOriginalPrice = formatCurrency(price);
    const formattedCurrentPrice = formatCurrency(currentPrice);

    return (
        <div className="product-info">
            <div className="product-main-info">
                <div className="product-info-item sku">
                    <span className="sku">
                        <span className="label">Артикул:</span>
                        <span className="value">{sku}</span>
                    </span>
                </div>

                {!uiBlocked && hasDiscount && isActive && (
                    <div className="product-info-item original-price">
                        <p className="original-price-value">{formattedOriginalPrice} руб.</p>

                        <div
                            className="discount-details"
                            title="Применена наибольшая из двух доступных скидок"
                        >
                            <p>
                                Скидка на товар:
                                <span className="discount">{productDiscount}%</span>
                            </p>
                            <p>
                                Клиентская скидка:
                                <span className="discount">{customerDiscount}%</span>
                            </p>
                            <p>
                                Применённая скидка:
                                <span className="discount applied">{effectiveDiscount}%</span>
                            </p>
                        </div>
                    </div>
                )}

                <div className="product-info-item current-price">
                    <p className="current-price-value">{formattedCurrentPrice} руб.</p>

                    {!uiBlocked && !available && (
                        <div className="out-of-stock">
                            <span className="icon">❌</span>
                            Нет в наличии
                        </div>
                    )}

                    {!uiBlocked && !isActive && (
                        <div className="inactive">
                            <span className="icon">🔒</span>
                            Не продаётся
                        </div>
                    )}

                    {showCartControls && (
                        <ProductQuantitySelector
                            id={id}
                            availableQuantity={available}
                            orderedQuantity={quantity}
                            quantityReduced={quantityReduced}
                            isTouchDevice={isTouchDevice}
                            isAuthenticated={isAuthenticated}
                            uiBlocked={uiBlocked}
                        />
                    )}
                </div>
            </div>

            <div className="product-additional-info">
                <div className="product-info-item available">
                    <span className="label">Количество на складе:</span>
                    <span className="value">
                        {(uiBlocked || !isActive)
                            ? NO_VALUE_LABEL
                            : (
                                <>
                                    {available} {unit}
                                    {isRestocked && <span className="restock"> → поступление</span>}
                                </>
                            )}
                    </span>
                </div>

                <div className="product-info-item name">
                    <span className="label">Наименование:</span>
                    <span className="value">{name}</span>
                </div>

                <div className="product-info-item brand">
                    <span className="label">Бренд:</span>
                    <span className="value">{brand}</span>
                </div>

                <div className="product-info-item description">
                    <span className="label">Описание:</span>
                    <span className="value">{description}</span>
                </div>
            </div>
        </div>
    );
}
