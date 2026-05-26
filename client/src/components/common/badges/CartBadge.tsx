import cn from 'classnames';
import { useAppSelector } from '@/hooks/storeHooks.js';
import { formatCurrency } from '@/helpers/textHelpers.js';
import { pluralize } from '@/helpers/textHelpers.js';

export default function CartBadge() {
    const cartState = useAppSelector(state => state.cart);
    
    const cartItemListCount = cartState.ids.length;
    const cartDiscountedTotal = cartState.discountedTotal;

    return (
        <div className="badge-box">
            <span className={cn('badge', { 'inactive': !cartDiscountedTotal })}>
                {formatCurrency(cartDiscountedTotal)} ₽
            </span>
            <span className={cn('badge', { 'inactive': !cartItemListCount })}>
                {cartItemListCount} {pluralize(cartItemListCount, ['позиция', 'позиции', 'позиций'])}
            </span>
        </div>
    );
}
