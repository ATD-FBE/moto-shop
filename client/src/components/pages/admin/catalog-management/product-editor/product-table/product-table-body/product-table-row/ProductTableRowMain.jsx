import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import { formatProductTitle } from '@/helpers/textHelpers.js';
import generateSlug from '@/helpers/generateSlug.js';
import { routeConfig } from '@/config/appRouting.js';
import { PRODUCT_IMAGE_PLACEHOLDER, NO_VALUE_LABEL } from '@/config/constants.js';

export default function ProductTableRowMain({
    uiBlocked,
    product,
    allowedCategories,
    isHovered,
    isSelected,
    isExpanded,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion
}) {
    const {
        id, images, mainImageIndex, sku, name, brand, description, stock, reserved,
        isBrandNew, isRestocked, unit, price, discount, category, tags, isActive
    } = product;

    const title = formatProductTitle(name, brand);
    const slug = generateSlug(title);
    const productUrl = routeConfig.productDetails.generatePath({ slug, sku, productId: id });

    const hasImages = images.length > 0;
    const thumbImageSrc = hasImages
        ? (images[mainImageIndex] ?? images[0]).thumbnails.small
        : PRODUCT_IMAGE_PLACEHOLDER;
    const thumbImageAlt = hasImages ? title : '';
    
    return (
        <div 
            role="row"
            className={cn(
                'table-row-main',
                {
                    'hovered': isHovered,
                    'warning': stock === 0,
                    'inactive': !isActive
                }
            )}
        >
            <div role="cell" className="row-cell select">
                <div className="cell-label">Выбрать:</div>
                <div className="cell-content">
                    <DesignedCheckbox
                        checked={isSelected}
                        onChange={() => onToggleSelection(id)}
                        disabled={uiBlocked}
                    />
                </div>
            </div>
            <div role="cell" className="row-cell thumb-link">
                <div className="cell-label">Фото:</div>
                <div className="cell-content">
                    {isBrandNew && <p className="brand-new">Новинка!</p>}
                    <div className="product-thumb">
                        <BlockableLink to={productUrl}>
                            <TrackedImage
                                className="product-thumb-img"
                                src={thumbImageSrc}
                                alt={thumbImageAlt}
                            />
                        </BlockableLink>
                    </div>
                </div>
            </div>
            <div role="cell" className="row-cell id-sku">
                <div className="cell-label">ID / Артикул:</div>
                <div className="cell-content">
                    <p>ID: {id}</p>
                    <p>Артикул: {sku || NO_VALUE_LABEL}</p>
                </div>
            </div>
            <div role="cell" className="row-cell name-brand">
                <div className="cell-label">Наименование и бренд:</div>
                <div className="cell-content">{title}</div>
            </div>
            <div role="cell" className="row-cell description">
                <div className="cell-label">Описание:</div>
                <div className="cell-content">{description || NO_VALUE_LABEL}</div>
            </div>
            <div role="cell" className="row-cell stock-unit">
                <div className="cell-label">Количество:</div>
                <div className="cell-content">
                    {stock} {unit}
                    {isRestocked && <span className="restock"> → поступление</span>}
                    {reserved > 0 && <span className="reserv"><br />(резерв: {reserved} {unit})</span>}
                </div>
            </div>
            <div role="cell" className="row-cell price-discount">
                <div className="cell-label">Цена (-уценка):</div>
                <div className="cell-content">{price} руб.{discount > 0 ? ` (-${discount}%)` : ''}</div>
            </div>
            <div role="cell" className="row-cell category">
                <div className="cell-label">Категория:</div>
                <div className="cell-content">
                    {allowedCategories.find(cat => cat.id === category)?.name ?? (
                        <span className="invalid-category">⚠️ Ошибка размещения!</span>
                    )}
                </div>
            </div>
            <div role="cell" className="row-cell tags">
                <div className="cell-label">Теги:</div>
                <div className="cell-content">{tags || NO_VALUE_LABEL}</div>
            </div>
            <div role="cell" className="row-cell edit">
                <div className="cell-label">Редактирование:</div>
                <div className="cell-content button">
                    <button
                        className={cn('edit-product-btn', { 'enabled': isExpanded })}
                        onClick={() => onToggleExpansion(id)}
                    >
                        <span className="icon">{isExpanded ? '🔼' : '🖊'}</span>
                        {isExpanded ? 'Скрыть форму' : 'Редактировать'}
                    </button>
                </div>
            </div>
            <div role="cell" className="row-cell delete">
                <div className="cell-label">Удаление:</div>
                <div className="cell-content button">
                    <button
                        className="delete-product-btn"
                        onClick={() => onConfirmDeletion(product)}
                        disabled={uiBlocked}
                    >
                        <span className="icon">❌</span>
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    );
}
