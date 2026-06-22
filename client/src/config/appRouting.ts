// Public Pages
//import Home from '@/components/pages/public/Home.jsx';
//import AboutShop from '@/components/pages/public/AboutShop.jsx';
//import EventsMenu from '@/components/pages/public/EventsMenu.jsx';
//import News from '@/components/pages/public/events-menu/News.jsx';
//import Promotions from '@/components/pages/public/events-menu/Promotions.jsx';
//import Catalog from '@/components/pages/public/Catalog.jsx';
//import ProductDetails from '@/components/pages/public/catalog/ProductDetails.jsx';
//import Delivery from '@/components/pages/public/Delivery.jsx';
//import DocumentsMenu from '@/components/pages/public/DocumentsMenu.jsx';
//import Guarantees from '@/components/pages/public/documents-menu/Guarantees.jsx';
//import Insurance from '@/components/pages/public/documents-menu/Insurance.jsx';
//import Licenses from '@/components/pages/public/documents-menu/Licenses.jsx';
//import CompanyDetails from '@/components/pages/public/documents-menu/CompanyDetails.jsx';
//import Contacts from '@/components/pages/public/Contacts.jsx';

// Auth Pages
//import LoginForm from '@/components/pages/auth/LoginForm.jsx';
//import RegistrationForm from '@/components/pages/auth/RegistrationForm.jsx';

// Admin Pages
//import ErrorLogs from '@/components/pages/admin/personal-menu/ErrorLogs.jsx';
//import CatalogManagement from '@/components/pages/admin/CatalogManagement.jsx';
//import NotificationManagement from '@/components/pages/admin/NotificationManagement.jsx';
//import OrderManagement from '@/components/pages/admin/OrderManagement.jsx';
//import OrderDetailsManagement from '@/components/pages/admin/OrderDetailsManagement.jsx';
//import CustomerManagement from '@/components/pages/admin/CustomerManagement.jsx';
//import EventManagement from '@/components/pages/admin/EventManagement.jsx';
//import Statistics from '@/components/pages/admin/Statistics.jsx';

// Customer Pages
//import Cart from '@/components/pages/customer/Cart.jsx';
//import Checkout from '@/components/pages/customer/Checkout.jsx';
//import CheckoutPreferences from '@/components/pages/customer/personal-menu/CheckoutPreferences.jsx';
//import CustomerNotifications from '@/components/pages/customer/CustomerNotifications.jsx';
//import CustomerOrders from '@/components/pages/customer/CustomerOrders.jsx';
//import CustomerOrderDetails from '@/components/pages/customer/personal-menu/CustomerOrderDetails.jsx';
//import CardOnlinePayment from '@/components/pages/customer/CardOnlinePayment.jsx';

// Shared Pages
//import Personal from '@/components/pages/shared/Personal.jsx';
//import Profile from '@/components/pages/shared/personal-menu/Profile.jsx';

// Not Found Page
import NotFound from '@/components/pages/NotFound.jsx';

// Helpers
import { buildNavigationMap, buildBreadcrumbMap } from '@/helpers/routeHelpers.js';
import { getCustomerOrderDetailsPath } from '@shared/commonHelpers.js';

// Constants
import { AUTH_NAV_TYPE } from '@/config/constants.js';

export const routeConfig = {
    // Конфиги страниц с публичным доступом
    home: {
        label: '🏠 Главная',
        paths: ['/', '/home', '/index', '/index.html'],
        access: 'public',
        //component: Home,
        importComponent: () => import('@/components/pages/public/Home.jsx'),
        nav: { map: 'main', order: 0 }
    },
    about: {
        label: 'О магазине',
        paths: ['/about'],
        access: 'public',
        parent: 'home',
        //component: AboutShop,
        importComponent: () => import('@/components/pages/public/AboutShop.jsx'),
        nav: { map: 'main', order: 1 }
    },
    events: {
        label: 'События',
        paths: ['/events'],
        access: 'public',
        parent: 'home',
        //component: EventsMenu,
        importComponent: () => import('@/components/pages/public/EventsMenu.jsx'),
        nav: { map: 'main', order: 2, children: ['news', 'promotions'] }
    },
    news: {
        label: 'Новости',
        paths: ['/events/news'],
        access: 'public',
        parent: 'events',
        //component: News,
        importComponent: () => import('@/components/pages/public/events-menu/News.jsx')
    },
    promotions: {
        label: 'Акции',
        paths: ['/events/promotions'],
        access: 'public',
        parent: 'events',
        //component: Promotions,
        importComponent: () => import('@/components/pages/public/events-menu/Promotions.jsx')
    },
    catalog: {
        label: 'Каталог товаров',
        paths: ['/catalog', '/catalog/products'],
        access: 'public',
        parent: 'home',
        //component: Catalog,
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
        //component: ProductDetails,
        importComponent: () => import('@/components/pages/public/catalog/ProductDetails.jsx')
    },
    delivery: {
        label: 'Доставка и оплата',
        paths: ['/delivery'],
        access: 'public',
        parent: 'home',
        //component: Delivery,
        importComponent: () => import('@/components/pages/public/Delivery.jsx'),
        nav: { map: 'main', order: 4 }
    },
    documents: {
        label: 'Документы',
        paths: ['/documents'],
        access: 'public',
        parent: 'home',
        //component: DocumentsMenu,
        importComponent: () => import('@/components/pages/public/DocumentsMenu.jsx'),
        nav: { map: 'main', order: 5, children: ['guarantees', 'insurance', 'licenses', 'companyDetails'] }
    },
    guarantees: {
        label: 'Гарантии',
        paths: ['/documents/guarantees'],
        access: 'public',
        parent: 'documents',
        //component: Guarantees,
        importComponent: () => import('@/components/pages/public/documents-menu/Guarantees.jsx')
    },
    insurance: {
        label: 'Страхование',
        paths: ['/documents/insurance'],
        access: 'public',
        parent: 'documents',
        //component: Insurance,
        importComponent: () => import('@/components/pages/public/documents-menu/Insurance.jsx')
    },
    licenses: {
        label: 'Лицензии на товары',
        paths: ['/documents/licenses'],
        access: 'public',
        parent: 'documents',
        //component: Licenses,
        importComponent: () => import('@/components/pages/public/documents-menu/Licenses.jsx')
    },
    companyDetails: {
        label: 'Реквизиты магазина',
        paths: ['/documents/company'],
        access: 'public',
        parent: 'documents',
        //component: CompanyDetails,
        importComponent: () => import('@/components/pages/public/documents-menu/CompanyDetails.jsx')
    },
    contacts: {
        label: 'Контакты',
        paths: ['/contacts'],
        access: 'public',
        parent: 'home',
        //component: Contacts,
        importComponent: () => import('@/components/pages/public/Contacts.jsx'),
        nav: { map: 'main', order: 6 }
    },

    // Конфиги для пользователей с ролью admin
    adminCatalog: {
        label: 'Управление каталогом',
        paths: ['/admin/catalog'],
        access: 'admin',
        parent: 'home',
        //component: CatalogManagement,
        importComponent: () => import('@/components/pages/admin/CatalogManagement.jsx'),
        nav: { map: 'adminDashboard', order: 0, featured: true }
    },
    adminOrders: {
        label: 'Управление заказами',
        paths: ['/admin/orders'],
        access: 'admin',
        parent: 'home',
        //component: OrderManagement,
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
        //component: OrderDetailsManagement,
        importComponent: () => import('@/components/pages/admin/OrderDetailsManagement.jsx')
    },
    adminCustomers: {
        label: 'Клиенты и оповещения',
        paths: ['/admin/customers'],
        access: 'admin',
        parent: 'home',
        //component: CustomerManagement,
        importComponent: () => import('@/components/pages/admin/CustomerManagement.jsx'),
        nav: { map: 'adminDashboard', order: 2 }
    },
    adminNotifications: {
        label: 'Редактор уведомлений',
        paths: ['/admin/notifications'],
        access: 'admin',
        parent: 'adminCustomers',
        //component: NotificationManagement,
        importComponent: () => import('@/components/pages/admin/NotificationManagement.jsx')
    },
    adminEvents: {
        label: 'Редактор событий',
        paths: ['/admin/events'],
        access: 'admin',
        parent: 'home',
        //component: EventManagement,
        importComponent: () => import('@/components/pages/admin/EventManagement.jsx'),
        nav: { map: 'adminDashboard', order: 3 }
    },
    adminStatistics: {
        label: 'Статистика',
        paths: ['/admin/statistics'],
        access: 'admin',
        parent: 'home',
        //component: Statistics,
        importComponent: () => import('@/components/pages/admin/Statistics.jsx'),
        nav: { map: 'adminDashboard', order: 4 }
    },
    adminPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/admin'],
        access: 'admin',
        parent: 'home',
        //component: Personal,
        importComponent: () => import('@/components/pages/shared/Personal.jsx'),
        nav: { map: 'adminDashboard', order: 5 }
    },
    adminProfile: {
        label: 'Настройки аккаунта',
        paths: ['/admin/profile'],
        access: 'admin',
        parent: 'adminPersonal',
        //component: Profile,
        importComponent: () => import('@/components/pages/shared/personal-menu/Profile.jsx'),
        nav: { map: 'adminPersonal', order: 0 }
    },
    adminErrorLogs: {
        label: 'Логи ошибок',
        paths: ['/admin/errors'],
        access: 'admin',
        parent: 'adminPersonal',
        //component: ErrorLogs,
        importComponent: () => import('@/components/pages/admin/personal-menu/ErrorLogs.jsx'),
        nav: { map: 'adminPersonal', order: 1 }
    },

    // Конфиги для пользователей с ролью customer
    customerCart: {
        label: '🛒 Корзина',
        paths: ['/customer/cart'],
        access: 'customer',
        parent: 'home',
        //component: Cart,
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
        //component: Checkout,
        importComponent: () => import('@/components/pages/customer/Checkout.jsx')
    },
    customerNotifications: {
        label: '🔔 Уведомления',
        paths: ['/customer/notifications'],
        access: 'customer',
        parent: 'home',
        //component: CustomerNotifications,
        importComponent: () => import('@/components/pages/customer/CustomerNotifications.jsx'),
        nav: { map: 'customerDashboard', order: 1, badge: 'notifications' }
    },
    customerPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/customer'],
        access: 'customer',
        parent: 'home',
        //component: Personal,
        importComponent: () => import('@/components/pages/shared/Personal.jsx'),
        nav: { map: 'customerDashboard', order: 2 }
    },
    customerProfile: {
        label: 'Настройки аккаунта',
        paths: ['/customer/profile'],
        access: 'customer',
        parent: 'customerPersonal',
        //component: Profile,
        importComponent: () => import('@/components/pages/shared/personal-menu/Profile.jsx'),
        nav: { map: 'customerPersonal', order: 0 }
    },
    customerCheckoutPrefs: {
        label: 'Настройки заказа',
        paths: ['/customer/checkout-prefs'],
        access: 'customer',
        parent: 'customerPersonal',
        //component: CheckoutPreferences,
        importComponent: () => import('@/components/pages/customer/personal-menu/CheckoutPreferences.jsx'),
        nav: { map: 'customerPersonal', order: 1 }
    },
    customerOrders: {
        label: 'Просмотр заказов',
        paths: ['/customer/orders'],
        access: 'customer',
        parent: 'customerPersonal',
        //component: CustomerOrders,
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
        //component: CustomerOrderDetails,
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
        //component: CardOnlinePayment,
        importComponent: () => import('@/components/pages/customer/CardOnlinePayment.jsx')
    },

    // Конфиги для неавторизованных пользователей с доступом auth
    login: {
        label: 'Войти',
        paths: ['/login'],
        access: 'auth',
        //component: LoginForm,
        importComponent: () => import('@/components/pages/auth/LoginForm.jsx'),
        nav: { map: 'guestAuth', order: 0, authType: AUTH_NAV_TYPE.LINK }
    },
    register: {
        label: 'Регистрация',
        paths: ['/register'],
        access: 'auth',
        //component: RegistrationForm,
        importComponent: () => import('@/components/pages/auth/RegistrationForm.jsx'),
        nav: { map: 'guestAuth', order: 1, authType: AUTH_NAV_TYPE.LINK }
    },

    // Конфиг для отсутствующих страниц
    notFound: {
        label: '404 — Страница не найдена',
        paths: ['*'],
        access: 'public',
        parent: 'home',
        component: NotFound
    }
} as const;

export const navigationMap = buildNavigationMap();

export const breadcrumbMap = buildBreadcrumbMap();
