import { useMemo } from 'react';
import cn from 'classnames';
import CategoryEditor from '../CategoryEditor.js';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { findCategoryPath } from '@/helpers/categoryHelpers.js';
import { NO_VALUE_LABEL, DATA_LOAD_STATUS } from '@/config/constants.js';
import type { JSX, ComponentProps } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CategoryEditor>;

type TCategorySelectionPanelProps = Pick<TParentProps,
    | 'loadStatus'
    | 'categoryTree'
    | 'categoryMap'
    | 'selectedCategoryId'
    | 'setSelectedCategoryId'
    | 'loadCategories'
    | 'shouldProductsLoad'
    | 'setShouldProductsLoad'
    | 'uiBlocked'
>;

interface ICategoriesLoadStatusData {
    icon: string;
    iconClass: string;
    text: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const CATEGORIES_LOAD_STATUS_MAP: Partial<Record<TDataLoadStatus, ICategoriesLoadStatusData>> = {
    [DATA_LOAD_STATUS.LOADING]: {
        icon: '⏳',
        iconClass: 'load',
        text: 'Загрузка категорий товаров...'
    },
    [DATA_LOAD_STATUS.ERROR]: {
        icon: '❌',
        iconClass: 'error',
        text: 'Ошибка сервера. Категории товаров не доступны.'
    },
    [DATA_LOAD_STATUS.READY]: {
        icon: '✅',
        iconClass: 'ready',
        text: 'Категории товаров загружены.'
    }
} as const;
 
export default function CategorySelectionPanel({
    loadStatus,
    categoryTree,
    categoryMap,
    selectedCategoryId,
    setSelectedCategoryId,
    loadCategories,
    shouldProductsLoad,
    setShouldProductsLoad,
    uiBlocked,
}: TCategorySelectionPanelProps): JSX.Element {
    const selectedCategoryPath = useMemo(
        () => findCategoryPath(categoryTree, selectedCategoryId),
        [categoryTree, selectedCategoryId]
    );

    const loadStatusData = CATEGORIES_LOAD_STATUS_MAP[loadStatus];

    const getSelectPrompt = (id: string, selectedCategoryId: string, isRoot: boolean): string => {
        return id === selectedCategoryId
            ? isRoot ? 'Выбрать категорию' : 'Выбрать подкатегорию'
            : isRoot ? 'Очистить выбор категорий' : '⬑ К родительской категории';
    };

    return (
        <div className="category-selection-panel">
            <div className="categories-load-status">
                <span className={cn('icon', loadStatusData?.iconClass || '')}>
                    {loadStatusData?.icon || ''}
                </span>
                {loadStatusData?.text || NO_VALUE_LABEL}
            </div>

            {selectedCategoryPath.map((id, pathIdx, pathArr): JSX.Element | null => {
                const isRoot = pathIdx === 0;
                const subcategories = isRoot ? categoryTree : categoryMap[id]?.subcategories ?? [];
                if (!isRoot && !subcategories.length) return null;

                const isLevelActive = subcategories.some(cat => cat.id === selectedCategoryId);
                const selectPrompt = getSelectPrompt(id, selectedCategoryId, isRoot);

                return (
                    <div key={id || 'root-level'} className="category-level">
                        <label
                            htmlFor={`category-select-${id}`}
                            className={cn('category-label', { 'active': isLevelActive })}
                        >
                            <span className="label-count">{`${pathIdx + 1}.`}</span>
                            <span className="label-text">Выбранная категория</span>
                            <span className="label-icon">→</span>
                        </label>

                        <select
                            id={`category-select-${id}`}
                            value={pathArr[pathIdx + 1]}
                            onChange={(e) => setSelectedCategoryId(e.currentTarget.value)}
                            disabled={uiBlocked}
                        >
                            <option value={id}>{`--- ${selectPrompt} ---`}</option>

                            {subcategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {`${cat.order + 1}. ${cat.name}${cat.restricted ? '*' : ''}`}
                                </option>
                            ))}
                        </select>
                    </div>
                );
            })}

            {categoryMap[selectedCategoryId]?.restricted && (
                <p className="read-only-category-message">
                    *Категория с ограничениями: создание подкатегорий, перемещение,
                    изменение URL-адреса и удаление запрещены
                </p>
            )}

            <div className="category-selection-panel-controls">
                <DesignedCheckbox
                    label="Загружать и обновлять товары выбранной или всех категорий"
                    checked={shouldProductsLoad}
                    onChange={() => setShouldProductsLoad(prev => !prev)}
                    disabled={uiBlocked}
                />

                <button
                    className="reload-categories-btn"
                    onClick={loadCategories}
                    disabled={loadStatus === DATA_LOAD_STATUS.ERROR ? false : uiBlocked}
                >
                    <span className="icon">🔄</span>
                    Перезагрузить
                </button>
            </div>
        </div>
    );
}
