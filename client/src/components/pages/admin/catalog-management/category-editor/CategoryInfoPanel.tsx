import { CATEGORY_ROOT_LABEL, NO_VALUE_LABEL } from '@/config/constants.js';
import type { JSX } from 'react';
import type { TCategoryMap } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICategoryEditorProps {
    categoryMap: TCategoryMap;
    selectedCategoryId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function CategoryInfoPanel(
    { categoryMap, selectedCategoryId }: ICategoryEditorProps
): JSX.Element {
    const selectedCategory = categoryMap[selectedCategoryId];

    return (
        <div className="category-info-panel">
            <div className="panel-row panel-title">
                <h4>Параметры выбранной категории</h4>
            </div>

            <div className="panel-row">
                <div className="panel-col panel-row-label">ID:</div>
                <div className="panel-col panel-row-value">
                    {selectedCategory?.id ?? NO_VALUE_LABEL}
                </div>
            </div>
            <div className="panel-row">
                <div className="panel-col panel-row-label">Название:</div>
                <div className="panel-col panel-row-value">
                    {selectedCategoryId
                        ? selectedCategory?.name ?? NO_VALUE_LABEL
                        : 'Все категории'}
                </div>
            </div>
            <div className="panel-row">
                <div className="panel-col panel-row-label">URL-адрес:</div>
                <div className="panel-col panel-row-value">
                    {selectedCategory?.slug ?? NO_VALUE_LABEL}
                </div>
            </div>
            <div className="panel-row">
                <div className="panel-col panel-row-label">Порядковый номер:</div>
                <div className="panel-col panel-row-value">
                    {selectedCategory ? selectedCategory.order + 1 : NO_VALUE_LABEL}
                </div>
            </div>
            <div className="panel-row">
                <div className="panel-col panel-row-label">Родительская категория:</div>
                <div className="panel-col panel-row-value">
                    {selectedCategory?.parent
                        ? categoryMap[selectedCategory.parent]?.name ?? NO_VALUE_LABEL
                        : selectedCategoryId ? CATEGORY_ROOT_LABEL : NO_VALUE_LABEL}
                </div>
            </div>
        </div>
    );
}
