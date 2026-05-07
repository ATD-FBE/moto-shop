import { useState, useMemo } from 'react';
import cn from 'classnames';
import CategoryEditor from '../CategoryEditor.js';
import CategoryForm from './category-control-panel/CategoryForm.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import { buildSafeParentCategoryMap } from '@/helpers/categoryHelpers.js';
import { CATEGORY_ROOT_LABEL, CATEGORY_FORM_MODE } from '@/config/constants.js';
import type { JSX, ComponentProps } from 'react';
import type {
    TCategoryPerformFormSubmission,
    TCategoryFormMode,
    ICategoryCreateFormData,
    ICategoryEditFormData
} from '@/types/index.js';
import type { TCategoryTree } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CategoryEditor>;

type TCategoryControlPanelProps = Pick<TParentProps,
    | 'categoryTree'
    | 'categoryMap'
    | 'selectedCategoryId'
    | 'uiBlocked'
> & {
    processCategoryForm: (performFormSubmission: TCategoryPerformFormSubmission) => Promise<void>;
    confirmCategoryDeletion: () => void;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function CategoryControlPanel({
    categoryTree,
    categoryMap,
    selectedCategoryId,
    processCategoryForm,
    confirmCategoryDeletion,
    uiBlocked,
}: TCategoryControlPanelProps): JSX.Element {
    const [activeForm, setActiveForm] = useState<TCategoryFormMode | null>(null);

    const selectedCategory = categoryMap[selectedCategoryId];

    const parentCategoryMap = useMemo(
        () => buildSafeParentCategoryMap(categoryMap, categoryTree, CATEGORY_ROOT_LABEL),
        [categoryMap, categoryTree]
    );

    const toggleForm = (formMode: TCategoryFormMode): void =>
        setActiveForm(prev => prev === formMode ? null : formMode);

    const getSubcategories = (id: string | null | undefined): TCategoryTree =>
        id ? categoryMap[id]?.subcategories || [] : categoryTree;
      
    const createFormData = useMemo<ICategoryCreateFormData>(() => ({
        mode: CATEGORY_FORM_MODE.CREATE,
        categoryId: null,
        initValues: {
            name: '',
            slug: '',
            order: 0,
            parent: selectedCategoryId || null
        },
        defaultOrder: getSubcategories(selectedCategoryId).length,
        maxOrder: getSubcategories(selectedCategoryId).length,
        isRestricted: selectedCategory?.restricted ?? false,
        parentName: selectedCategory?.name ?? CATEGORY_ROOT_LABEL
    }), [selectedCategoryId, categoryMap]);

    const editFormData = useMemo<ICategoryEditFormData>(() => ({
        mode: CATEGORY_FORM_MODE.EDIT,
        categoryId: selectedCategoryId,
        initValues: {
            name: selectedCategory?.name ?? '',
            slug: selectedCategory?.slug ?? '',
            order: selectedCategory?.order ?? 0,
            parent: selectedCategory?.parent ?? null
        },
        maxOrder: getSubcategories(selectedCategory?.parent).length - 1,
        isRestricted: selectedCategory?.restricted ?? false,
        safeParentData: parentCategoryMap[selectedCategoryId] ?? {
            selectOptions: [],
            subcatCounts: {}
        }
    }), [selectedCategoryId, categoryMap]);

    return (
        <div className="category-control-panel">
            <div className="panel-row panel-title">
                <h4>Управление категорией</h4>
            </div>

            <div className="panel-row category-form-action">
                <button
                    className={cn(
                        'category-form-toggle-btn--create',
                        { 'enabled': activeForm === CATEGORY_FORM_MODE.CREATE }
                    )}
                    onClick={() => toggleForm(CATEGORY_FORM_MODE.CREATE)}
                    disabled={uiBlocked || selectedCategory?.restricted}
                >
                    <span className="icon">➕</span>
                    {selectedCategoryId ? 'Создать подкатегорию' : 'Создать категорию'}
                </button>

                <Collapsible
                    isExpanded={
                        activeForm === CATEGORY_FORM_MODE.CREATE &&
                        !selectedCategory?.restricted
                    }
                    className="category-form-collapsible"
                    showContextIndicator={false}
                >
                    {/* Форма для создания новой категории внутри выбранной */}
                    <CategoryForm
                        { ...createFormData }
                        onSubmit={processCategoryForm}
                        uiBlocked={uiBlocked}
                    />
                </Collapsible>
            </div>

            <div className="panel-row category-form-action">
                <button
                    className={cn(
                        'category-form-toggle-btn--edit',
                        { 'enabled': activeForm === CATEGORY_FORM_MODE.EDIT }
                    )}
                    onClick={() => toggleForm(CATEGORY_FORM_MODE.EDIT)}
                    disabled={uiBlocked || !selectedCategoryId}
                >
                    <span className="icon">🖊</span>
                    Изменить выбранную категорию
                </button>

                <Collapsible
                    isExpanded={activeForm === CATEGORY_FORM_MODE.EDIT && selectedCategoryId}
                    className="category-form-collapsible"
                    showContextIndicator={false}
                >
                    {/* Форма для редактирования выбранной категории */}
                    <CategoryForm
                        {...editFormData}
                        onSubmit={processCategoryForm}
                        uiBlocked={uiBlocked}
                    />
                </Collapsible>
            </div>

            <div className="panel-row">
                <button
                    className="delete-category-btn"
                    onClick={confirmCategoryDeletion}
                    disabled={uiBlocked || !selectedCategoryId || selectedCategory?.restricted}
                >
                    <span className="icon">❌</span>
                    Удалить выбранную категорию
                </button>
            </div>
        </div>
    );
}
