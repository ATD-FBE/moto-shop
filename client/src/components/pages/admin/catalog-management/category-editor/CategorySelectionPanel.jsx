import { useMemo } from 'react';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { findCategoryPath } from '@/helpers/categoryHelpers.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';

const loadStatusMap = {
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
};
 
export default function CategorySelectionPanel({
    loadStatus,
    uiBlocked,
    categoryTree,
    categoryMap,
    selectedCategoryId,
    setSelectedCategoryId,
    loadCategories,
    shouldProductsLoad,
    setShouldProductsLoad
}) {
    const selectedCategoryPath = useMemo(
        () => findCategoryPath(categoryTree, selectedCategoryId),
        [categoryTree, selectedCategoryId]
    );

    const loadStatusData = loadStatusMap[loadStatus];

    const getSelectPrompt = (id, selectedCategoryId, isRoot) => {
        return id === selectedCategoryId
            ? isRoot ? 'Выбрать категорию' : 'Выбрать подкатегорию'
            : isRoot ? 'Очистить выбор категорий' : '⬑ К родительской категории';
    };

    return (
        <div className="category-selection-panel">
            <div className="categories-load-status">
                <span className={cn('icon', loadStatusData.iconClass)}>
                    {loadStatusData.icon}
                </span>
                {loadStatusData.text}
            </div>

            {selectedCategoryPath.map((id, pathIdx, pathArr) => {
                const isRoot = pathIdx === 0;
                const subcategories = isRoot ? categoryTree : categoryMap[id]?.subcategories;
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
                    disabled={loadStatus === 'error' ? false : uiBlocked}
                >
                    <span className="icon">🔄</span>
                    Перезагрузить
                </button>
            </div>
        </div>
    );
}
