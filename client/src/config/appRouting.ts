import { buildNavigationMap, buildBreadcrumbMap } from '@/helpers/routeHelpers.js';
import { getCustomerOrderDetailsPath } from '@shared/commonHelpers.js';
import { AUTH_NAV_TYPE } from '@/config/constants.js';

export const routeConfig = {
    // Конфиги страниц с публичным доступом
    home: {
        label: '🏠 Главная',
        paths: ['/', '/home', '/index', '/index.html'],
        access: 'public',
        importComponent: () => import('@/components/pages/public/Home.jsx'),
        nav: { map: 'main', order: 0 }
    },
    about: {
        label: 'О магазине',
        paths: ['/about'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/AboutShop.jsx'),
        nav: { map: 'main', order: 1 }
    },
    events: {
        label: 'События',
        paths: ['/events'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/EventsMenu.jsx'),
        nav: { map: 'main', order: 2, children: ['news', 'promotions'] }
    },
    news: {
        label: 'Новости',
        paths: ['/events/news'],
        access: 'public',
        parent: 'events',
        importComponent: () => import('@/components/pages/public/events-menu/News.jsx')
    },
    promotions: {
        label: 'Акции',
        paths: ['/events/promotions'],
        access: 'public',
        parent: 'events',
        importComponent: () => import('@/components/pages/public/events-menu/Promotions.jsx')
    },
    catalog: {
        label: 'Каталог товаров',
        paths: ['/catalog', '/catalog/products'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/Catalog.jsx'),
        nav: { map: 'main', order: 3, featured: true }
    },
    productDetails: {
        label: (
            { productId, sku }: { productId: string, sku?: string }
        ): string => sku ? `Товар ${sku}` : productId ? `Товар #${productId}` : 'Товар',
        generatePath: (
            { productId, slug, sku }: { productId: string, slug: string, sku?: string }
        ): string => `/catalog/products/${slug}~${sku ?? ''}~${productId}`,
        paths: ['/catalog/products/:productKey'],
        paramSchema: { productKey: { split: '~', map: ['slug', 'sku', 'productId'] } },
        access: 'public',
        parent: 'catalog',
        importComponent: () => import('@/components/pages/public/catalog/ProductDetails.jsx')
    },
    delivery: {
        label: 'Доставка и оплата',
        paths: ['/delivery'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/Delivery.jsx'),
        nav: { map: 'main', order: 4 }
    },
    documents: {
        label: 'Документы',
        paths: ['/documents'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/DocumentsMenu.jsx'),
        nav: { map: 'main', order: 5, children: ['guarantees', 'insurance', 'licenses', 'companyDetails'] }
    },
    guarantees: {
        label: 'Гарантии',
        paths: ['/documents/guarantees'],
        access: 'public',
        parent: 'documents',
        importComponent: () => import('@/components/pages/public/documents-menu/Guarantees.jsx')
    },
    insurance: {
        label: 'Страхование',
        paths: ['/documents/insurance'],
        access: 'public',
        parent: 'documents',
        importComponent: () => import('@/components/pages/public/documents-menu/Insurance.jsx')
    },
    licenses: {
        label: 'Лицензии на товары',
        paths: ['/documents/licenses'],
        access: 'public',
        parent: 'documents',
        importComponent: () => import('@/components/pages/public/documents-menu/Licenses.jsx')
    },
    companyDetails: {
        label: 'Реквизиты магазина',
        paths: ['/documents/company'],
        access: 'public',
        parent: 'documents',
        importComponent: () => import('@/components/pages/public/documents-menu/CompanyDetails.jsx')
    },
    contacts: {
        label: 'Контакты',
        paths: ['/contacts'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/public/Contacts.jsx'),
        nav: { map: 'main', order: 6 }
    },

    // Конфиги для пользователей с ролью admin
    adminCatalog: {
        label: 'Управление каталогом',
        paths: ['/admin/catalog'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/admin/CatalogManagement.jsx'),
        nav: { map: 'adminDashboard', order: 0, featured: true }
    },
    adminOrders: {
        label: 'Управление заказами',
        paths: ['/admin/orders'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/admin/OrderManagement.jsx'),
        nav: { map: 'adminDashboard', order: 1, badge: 'order-management' }
    },
    adminOrderDetails: {
        label: (
            { orderNumber }: { orderNumber?: string }
        ): string => orderNumber ? `Заказ №${orderNumber}` : 'Заказ',
        generatePath: (
            { orderId, orderNumber }: { orderId: string, orderNumber: string }
        ): string => `/admin/orders/${orderNumber}~${orderId}`,
        paths: ['/admin/orders/:orderKey'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'admin',
        parent: 'adminOrders',
        importComponent: () => import('@/components/pages/admin/OrderDetailsManagement.jsx')
    },
    adminCustomers: {
        label: 'Клиенты и оповещения',
        paths: ['/admin/customers'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/admin/CustomerManagement.jsx'),
        nav: { map: 'adminDashboard', order: 2 }
    },
    adminNotifications: {
        label: 'Редактор уведомлений',
        paths: ['/admin/notifications'],
        access: 'admin',
        parent: 'adminCustomers',
        importComponent: () => import('@/components/pages/admin/NotificationManagement.jsx')
    },
    adminEvents: {
        label: 'Редактор событий',
        paths: ['/admin/events'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/admin/EventManagement.jsx'),
        nav: { map: 'adminDashboard', order: 3 }
    },
    adminStatistics: {
        label: 'Статистика',
        paths: ['/admin/statistics'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/admin/Statistics.jsx'),
        nav: { map: 'adminDashboard', order: 4 }
    },
    adminPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/admin'],
        access: 'admin',
        parent: 'home',
        importComponent: () => import('@/components/pages/shared/Personal.jsx'),
        nav: { map: 'adminDashboard', order: 5 }
    },
    adminProfile: {
        label: 'Настройки аккаунта',
        paths: ['/admin/profile'],
        access: 'admin',
        parent: 'adminPersonal',
        importComponent: () => import('@/components/pages/shared/personal-menu/Profile.jsx'),
        nav: { map: 'adminPersonal', order: 0 }
    },
    adminErrorLogs: {
        label: 'Логи ошибок',
        paths: ['/admin/errors'],
        access: 'admin',
        parent: 'adminPersonal',
        importComponent: () => import('@/components/pages/admin/personal-menu/ErrorLogs.jsx'),
        nav: { map: 'adminPersonal', order: 1 }
    },

    // Конфиги для пользователей с ролью customer
    customerCart: {
        label: '🛒 Корзина',
        paths: ['/customer/cart'],
        access: 'customer',
        parent: 'home',
        importComponent: () => import('@/components/pages/customer/Cart.jsx'),
        nav: { map: 'customerDashboard', order: 0, featured: true, badge: 'cart' }
    },
    customerCheckout: {
        label: 'Оформление заказа',
        generatePath: (
            { orderId }: { orderId: string }
        ): string => `/customer/checkout/${orderId}`,
        paths: ['/customer/checkout/:orderId'],
        access: 'customer',
        parent: 'customerCart',
        importComponent: () => import('@/components/pages/customer/Checkout.jsx')
    },
    customerNotifications: {
        label: '🔔 Уведомления',
        paths: ['/customer/notifications'],
        access: 'customer',
        parent: 'home',
        importComponent: () => import('@/components/pages/customer/CustomerNotifications.jsx'),
        nav: { map: 'customerDashboard', order: 1, badge: 'notifications' }
    },
    customerPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/customer'],
        access: 'customer',
        parent: 'home',
        importComponent: () => import('@/components/pages/shared/Personal.jsx'),
        nav: { map: 'customerDashboard', order: 2 }
    },
    customerProfile: {
        label: 'Настройки аккаунта',
        paths: ['/customer/profile'],
        access: 'customer',
        parent: 'customerPersonal',
        importComponent: () => import('@/components/pages/shared/personal-menu/Profile.jsx'),
        nav: { map: 'customerPersonal', order: 0 }
    },
    customerCheckoutPrefs: {
        label: 'Настройки заказа',
        paths: ['/customer/checkout-prefs'],
        access: 'customer',
        parent: 'customerPersonal',
        importComponent: () => import('@/components/pages/customer/personal-menu/CheckoutPreferences.jsx'),
        nav: { map: 'customerPersonal', order: 1 }
    },
    customerOrders: {
        label: 'Просмотр заказов',
        paths: ['/customer/orders'],
        access: 'customer',
        parent: 'customerPersonal',
        importComponent: () => import('@/components/pages/customer/CustomerOrders.jsx'),
        nav: { map: 'customerPersonal', order: 2 }
    },
    customerOrderDetails: {
        label: (
            { orderNumber }: { orderNumber?: string }
        ): string => orderNumber ? `Заказ №${orderNumber}` : 'Заказ',
        generatePath: getCustomerOrderDetailsPath,
        paths: ['/customer/orders/:orderKey'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'customer',
        parent: 'customerOrders',
        importComponent: () => import('@/components/pages/customer/personal-menu/CustomerOrderDetails.jsx')
    },
    customerOrderCardOnlinePayment: {
        label: 'Оплата картой',
        generatePath: (
            { orderId, orderNumber }: { orderId: string, orderNumber: string }
        ): string => `/customer/orders/${orderNumber}~${orderId}/payment/card-online`,
        paths: ['/customer/orders/:orderKey/payment/card-online'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'customer',
        parent: 'customerOrderDetails',
        importComponent: () => import('@/components/pages/customer/CardOnlinePayment.jsx')
    },

    // Конфиги для неавторизованных пользователей с доступом auth
    login: {
        label: 'Войти',
        paths: ['/login'],
        access: 'auth',
        importComponent: () => import('@/components/pages/auth/LoginForm.jsx'),
        nav: { map: 'guestAuth', order: 0, authType: AUTH_NAV_TYPE.LINK }
    },
    register: {
        label: 'Регистрация',
        paths: ['/register'],
        access: 'auth',
        importComponent: () => import('@/components/pages/auth/RegistrationForm.jsx'),
        nav: { map: 'guestAuth', order: 1, authType: AUTH_NAV_TYPE.LINK }
    },

    // Конфиг для отсутствующих страниц
    notFound: {
        label: '404 — Страница не найдена',
        paths: ['*'],
        access: 'public',
        parent: 'home',
        importComponent: () => import('@/components/pages/NotFound.jsx')
    }
} as const;

export const navigationMap = buildNavigationMap();

export const breadcrumbMap = buildBreadcrumbMap();
