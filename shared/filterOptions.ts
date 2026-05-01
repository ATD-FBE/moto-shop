import { formatDateOnly, getFilterOptionsByContext } from './commonHelpers.js';
import {
    ORDER_STATUS,
    ORDER_ACTIVE_STATUSES,
    FINANCIALS_ACTIVE_STATES,
    FINANCIALS_FINAL_STATES
} from './constants.js';


export const customersFilterOptions = [
    {
        dbField: 'createdAt',
        label: 'Дата регистрации',
        type: 'date',
        minParamName: 'regDateStart',
        maxParamName: 'regDateEnd',
        minLimit: '',
        maxLimit: formatDateOnly(new Date())
    },
    {
        dbField: 'discount',
        label: 'Скидка (%)',
        type: 'number',
        minParamName: 'minDiscount',
        maxParamName: 'maxDiscount',
        minLimit: '0',
        maxLimit: '100'
    },
    {
        dbField: 'totalSpent',
        label: 'Сумма покупок (руб.)',
        type: 'number',
        minParamName: 'minTotalSpent',
        maxParamName: 'maxTotalSpent',
        minLimit: '0',
        maxLimit: ''
    },
    {
        dbField: 'isBanned',
        label: 'Заблокированные',
        type: 'boolean',
        paramName: 'ban',
        defaultValue: ''
    }
] as const;

export const productsFilterConfig = [
    {
        dbField: 'price',
        label: 'Цена (руб.)',
        type: 'number',
        minParamName: 'minPrice',
        maxParamName: 'maxPrice',
        minLimit: '0',
        maxLimit: '',
        contexts: ['catalog', 'editor']
    },
    {
        dbField: 'discount',
        label: 'Уценка (%)',
        type: 'number',
        minParamName: 'minDiscount',
        maxParamName: 'maxDiscount',
        minLimit: '0',
        maxLimit: '100',
        contexts: ['catalog', 'editor']
    },
    {
        dbField: 'inStock',
        label: 'В наличии',
        type: 'boolean',
        paramName: 'inStock',
        contexts: ['catalog', 'editor'],
        defaultByContext: {
            catalog: 'true',
            editor: ''
        }
    },
    {
        dbField: 'isBrandNew',
        label: 'Новинки',
        type: 'boolean',
        paramName: 'brandNew',
        defaultValue: '',
        contexts: ['catalog', 'editor']
    },
    {
        dbField: 'isRestocked',
        label: 'Недавно пополненные',
        type: 'boolean',
        paramName: 'restocked',
        defaultValue: '',
        contexts: ['catalog', 'editor']
    },
    {
        dbField: 'isActive',
        label: 'В продаже',
        type: 'boolean',
        paramName: 'active',
        contexts: ['editor'],
        defaultByContext: {
            editor: ''
        }
    }
] as const;

export const productCatalogFilterOptions = getFilterOptionsByContext(productsFilterConfig, 'catalog');
export const productEditorFilterOptions = getFilterOptionsByContext(productsFilterConfig, 'editor');

export const ordersFilterOptions = [
    {
        dbField: 'currentStatus',
        label: 'Статус заказа',
        type: 'string',
        paramName: 'orderStatus',
        valueOptions: [
            { value: '', label: 'Любой' },
            { value: 'active', label: 'Активный', matches: ORDER_ACTIVE_STATUSES },
            { value: ORDER_STATUS.COMPLETED, label: 'Выполненный' },
            { value: ORDER_STATUS.CANCELLED, label: 'Отменённый' }
        ],
        defaultValue: ''
    },
    {
        dbField: 'financials.state',
        label: 'Финансовый статус',
        type: 'string',
        paramName: 'financialsState',
        valueOptions: [
            { value: '', label: 'Любой' },
            { value: 'inProgress', label: 'Открытый', matches: FINANCIALS_ACTIVE_STATES },
            { value: 'final', label: 'Закрытый', matches: FINANCIALS_FINAL_STATES }
        ],
        defaultValue: ''
    }
] as const;
