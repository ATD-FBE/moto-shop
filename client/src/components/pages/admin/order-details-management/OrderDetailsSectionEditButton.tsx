import cn from 'classnames';
import type { JSX } from 'react';
import type { TOrderDetailsEditSection } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderDetailsSectionEditButtonProps {
    section: TOrderDetailsEditSection;
    isFormExpanded: boolean;
    toggleSectionFormExpansion: (section: TOrderDetailsEditSection) => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderDetailsSectionEditButton(
    { section, isFormExpanded, toggleSectionFormExpansion }: IOrderDetailsSectionEditButtonProps
): JSX.Element {
    return (
        <button
            className={cn('edit-order-details-section-btn', { 'enabled': isFormExpanded })}
            onClick={() => toggleSectionFormExpansion(section)}
            aria-label="Редактировать данные заказа соответствующего раздела"
        >
            <span className="icon">🖊</span>
            Редактировать
        </button>
    );
}
