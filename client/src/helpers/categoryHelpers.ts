import type { ICategory, ICategoryNode, TCategoryTree, TCategoryMap } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IBuildCategoryTreeAndMapResult {
    categoryTree: TCategoryTree;
    categoryMap: TCategoryMap;
}

type TGetLeafCategoriesResult = {
    id: string;
    name: string;
    slug: string;
}[];

interface ISafeParentCategoryOption {
    id: string;
    label: string;
    subcategoryCount: number;
}

type ISafeParentCategory = Record<string, number>;

type IBuildSafeParentCategoryMapResult = Record<string, {
    selectOptions: ISafeParentCategoryOption[];
    subcatCounts: ISafeParentCategory;
}>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

// Функция создания карты категорий и полноценного дерева из прямых данных
export const buildCategoryTreeAndMap = (
    flatCategoryList: ICategory[]
): IBuildCategoryTreeAndMapResult => {
    const categoryTree: TCategoryTree = [];
    const categoryMap: TCategoryMap = {};

    // Создание карты категорий по ключу id
    flatCategoryList.forEach(({ id, ...rest }) => {
        categoryMap[id] = { id, ...rest, subcategories: [] };
    });

    // Заполнение подкатегорий карты и сборка дерева
    flatCategoryList.forEach(cat => {
        const node = categoryMap[cat.id];

        if (cat.parent) {
            const parentNode = categoryMap[cat.parent];

            if (parentNode) {
                parentNode.subcategories.push(node);
            } else {
                console.error(`Категория ${cat.id} ссылается на отсутствующего родителя ${cat.parent}`);
            }
        } else {
            categoryTree.push(node);
        }
    });

    // Рекурсивная сортировка подкатегорий
    const sortNodesByOrder = (nodes: TCategoryTree) => {
        nodes.sort((a, b) => a.order - b.order);    // Сортировка корневых категорий
        nodes.forEach(node => {                     // Сортировка вложенных подкатегорий
            if (node.subcategories.length > 0) {
                sortNodesByOrder(node.subcategories);
            }
        });
    };

    sortNodesByOrder(categoryTree);

    return { categoryTree, categoryMap };
};

// Рекурсивная функция создания цепочки имён (пути) от корня к выбранной категории
export const findCategoryPath = (
    categoryTree: TCategoryTree,
    selectedCategoryId: string
): string[] => {
    if (!selectedCategoryId) return [''];

    const findPath = (tree: TCategoryTree): string[] => {
        for (const category of tree) {
            if (category.id === selectedCategoryId) return [category.id];

            const path = findPath(category.subcategories);
            if (path.length > 0) return [category.id, ...path];
        }
        return [];
    };

    const path = findPath(categoryTree);
    return path.length > 0 ? ['', ...path] : [];
};

// Рекурсивная функция получения ID всех категорий, имеющих подкатегории
export const getAllExpandableCategoryIds = (categoryTree: TCategoryTree): string[] => {
    const openableCategories: string[] = [];

    for (const cat of categoryTree) {
        if (!cat.subcategories.length) continue;
        openableCategories.push(cat.id, ...getAllExpandableCategoryIds(cat.subcategories));
    }

    return openableCategories;
};

// Получение всех конечных категорий - рекурсивный вариант по дереву
export const getLeafCategories = (categoryTree: TCategoryTree): TGetLeafCategoriesResult =>
    categoryTree.flatMap(cat =>
        !cat.subcategories.length
            ? [{ id: cat.id, name: cat.name, slug: cat.slug }]
            : getLeafCategories(cat.subcategories)
    );

// Получение всех конечных категорий - вариант с фильтрацией карты
/*export const getLeafCategories = (categoryMap: TCategoryMap): TGetLeafCategoriesResult =>
    Object.values(categoryMap)
        .filter(cat => !cat.subcategories.length)
        .map(cat => ({ id: cat.id, name: cat.name, slug: cat.slug }));*/

// Рекурсивная функция получения всех потомков выбранной категории
export const getDescendantCategoryIds = (selectedCategory?: ICategoryNode): string[] => {
    const descendants: string[] = [];

    const getDescendants = (tree: TCategoryTree): void => {
        for (const category of tree) {
            descendants.push(category.id);
            getDescendants(category.subcategories);
        }
    };

    if (selectedCategory) {
        getDescendants(selectedCategory.subcategories);
    }
    return descendants;
};

// Рекурсивная функция создания карты всех валидных родителей для категории
export const buildSafeParentCategoryMap = (
    categoryMap: TCategoryMap,
    categoryTree: TCategoryTree,
    rootLabel: string = '(корень)'
): IBuildSafeParentCategoryMapResult => {
    const allCategories = Object.values(categoryMap);

    // Создание карты потомков для их кэширования
    const descendantsCache = new Map<string, Set<string>>();

    const getDescendants = (cat: ICategoryNode): Set<string> => {
        // Поиск потомков в кэше
        const descendants = descendantsCache.get(cat.id);
        if (descendants) return descendants;

        const descendantSet = new Set<string>(); // Собирать потомков в Set для быстрого доступа

        for (const subcat of cat.subcategories) {
            descendantSet.add(subcat.id);

            const subcatDescendants = getDescendants(subcat);
            subcatDescendants.forEach(id => descendantSet.add(id));
        }

        descendantsCache.set(cat.id, descendantSet); // Кэширование потомков
        return descendantSet;
    };

    allCategories.forEach(cat => getDescendants(cat));

    // Сбор select-опций для выбора родителя категорий
    const rootOption: ISafeParentCategoryOption = {
        id: '',
        label: `${rootLabel} (${categoryTree.length || 'нет'} кат.)`,
        subcategoryCount: categoryTree.length
    };

    const dataMap = allCategories.reduce((map, currentCat) => {
        const descendants = descendantsCache.get(currentCat.id); // Set

        if (!descendants) {
            console.warn(`Missing cache for ${currentCat.id}`);
            return map;
        }

        const options: ISafeParentCategoryOption[] = allCategories
            .filter(cat =>
                cat.id !== currentCat.id &&
                !descendants.has(cat.id) &&
                !cat.restricted
            )
            .map(cat => ({
                id: cat.id,
                label: `${cat.name} (${cat.subcategories.length || 'нет'} подкат.)`,
                subcategoryCount: cat.subcategories.length
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        const subcatCounts = options.reduce((acc, { id, subcategoryCount }) => {
            acc[id] = subcategoryCount;
            return acc;
        }, {} as ISafeParentCategory);
        subcatCounts[rootOption.id] = rootOption.subcategoryCount;

        map[currentCat.id] = {
            selectOptions: [rootOption, ...options],
            subcatCounts
        };

        return map;
    }, {} as IBuildSafeParentCategoryMapResult);

    return dataMap;
};
