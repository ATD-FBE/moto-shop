import type { ISortOption } from '@shared/types/index.js';
import type { TDbNotification, TDbUser, TDbProductView, TDbOrderFinal } from '@server/types/db.types.js';

export const notificationsSortOptions = [
    { dbField: 'sentAt', label: 'Дата получения', defaultOrder: 'desc' },
    //{ dbField: 'isRead', label: 'Новые', defaultOrder: 'desc' } // В типе TDbNotificationCustomer
] as const satisfies readonly ISortOption<TDbNotification>[];

export const customersSortOptions = [
    { dbField: 'createdAt', label: 'Дата регистрации', defaultOrder: 'desc' },
    { dbField: 'name', label: 'Имя клиента', defaultOrder: 'asc' },
    { dbField: 'discount', label: 'Скидка', defaultOrder: 'desc' },
    { dbField: 'totalSpent', label: 'Сумма покупок', defaultOrder: 'desc' },
    { dbField: 'isBanned', label: 'Блокировка', defaultOrder: 'desc' }
] as const satisfies readonly ISortOption<TDbUser>[];

export const productCatalogSortOptions = [
    { dbField: 'name', label: 'Наименование', defaultOrder: 'asc' },
    { dbField: 'brand', label: 'Бренд', defaultOrder: 'asc' },
    { dbField: 'sku', label: 'Артикул', defaultOrder: 'asc' },
    { dbField: 'lastRestockAt', label: 'Дата пополнения', defaultOrder: 'desc' },
    { dbField: 'stock', label: 'Количество', defaultOrder: 'desc' },
    { dbField: 'price', label: 'Цена', defaultOrder: 'asc' },
    { dbField: 'discount', label: 'Уценка', defaultOrder: 'desc' }
] as const satisfies readonly ISortOption<TDbProductView>[];

export const productEditorSortOptions = [
    { dbField: 'sku', label: 'Артикул', defaultOrder: 'asc' },
    { dbField: 'name', label: 'Наименование', defaultOrder: 'asc' },
    { dbField: 'brand', label: 'Бренд', defaultOrder: 'asc' },
    { dbField: 'createdAt', label: 'Дата создания', defaultOrder: 'desc' },
    { dbField: 'lastRestockAt', label: 'Дата пополнения', defaultOrder: 'desc' },
    { dbField: 'stock', label: 'Количество', defaultOrder: 'asc' },
    { dbField: 'price', label: 'Цена', defaultOrder: 'asc' },
    { dbField: 'discount', label: 'Уценка', defaultOrder: 'desc' }
] as const satisfies readonly ISortOption<TDbProductView>[];

export const ordersSortOptions = [
    { dbField: 'confirmedAt', label: 'Дата оформления', defaultOrder: 'desc' },
    { dbField: 'lastActivityAt', label: 'Обновление состояния', defaultOrder: 'desc' }
] as const satisfies readonly ISortOption<TDbOrderFinal>[];
