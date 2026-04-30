// Public Pages
import Home from '@/components/pages/public/Home.jsx';
import AboutShop from '@/components/pages/public/AboutShop.jsx';
import EventsMenu from '@/components/pages/public/EventsMenu.jsx';
import News from '@/components/pages/public/events-menu/News.jsx';
import Promotions from '@/components/pages/public/events-menu/Promotions.jsx';
import Catalog from '@/components/pages/public/Catalog.jsx';
import ProductDetails from '@/components/pages/public/catalog/ProductDetails.jsx';
import Delivery from '@/components/pages/public/Delivery.jsx';
import DocumentsMenu from '@/components/pages/public/DocumentsMenu.jsx';
import Guarantees from '@/components/pages/public/documents-menu/Guarantees.jsx';
import Insurance from '@/components/pages/public/documents-menu/Insurance.jsx';
import Licenses from '@/components/pages/public/documents-menu/Licenses.jsx';
import CompanyDetails from '@/components/pages/public/documents-menu/CompanyDetails.jsx';
import Contacts from '@/components/pages/public/Contacts.jsx';

// Auth Pages
import LoginForm from '@/components/pages/auth/LoginForm.jsx';
import RegistrationForm from '@/components/pages/auth/RegistrationForm.jsx';

// Admin Pages
import ErrorLogs from '@/components/pages/admin/personal-menu/ErrorLogs.jsx';
import CatalogManagement from '@/components/pages/admin/CatalogManagement.jsx';
import NotificationManagement from '@/components/pages/admin/NotificationManagement.jsx';
import OrderManagement from '@/components/pages/admin/OrderManagement.jsx';
import OrderDetailsManagement from '@/components/pages/admin/OrderDetailsManagement.jsx';
import CustomerManagement from '@/components/pages/admin/CustomerManagement.jsx';
import EventManagement from '@/components/pages/admin/EventManagement.jsx';
import Statistics from '@/components/pages/admin/Statistics.jsx';

// Customer Pages
import Cart from '@/components/pages/customer/Cart.jsx';
import Checkout from '@/components/pages/customer/Checkout.jsx';
import CheckoutPreferences from '@/components/pages/customer/personal-menu/CheckoutPreferences.jsx';
import CustomerNotifications from '@/components/pages/customer/CustomerNotifications.jsx';
import CustomerOrders from '@/components/pages/customer/CustomerOrders.jsx';
import CustomerOrderDetails from '@/components/pages/customer/personal-menu/CustomerOrderDetails.jsx';
import CardOnlinePayment from '@/components/pages/customer/CardOnlinePayment.jsx';

// Shared Pages
import Personal from '@/components/pages/shared/Personal.jsx';
import Profile from '@/components/pages/shared/personal-menu/Profile.jsx';

// Not Found Page
import NotFound from '@/components/pages/NotFound.jsx';

// Helpers
import { buildNavigationMap, buildBreadcrumbMap } from '@/helpers/routeHelpers.js';
import { getCustomerOrderDetailsPath } from '@shared/commonHelpers.js';

export const routeConfig = {
    // Конфиги страниц с публичным доступом
    home: {
        label: '🏠 Главная',
        paths: ['/', '/home', '/index', '/index.html'],
        access: 'public',
        component: Home,
        nav: { map: 'main', order: 0 }
    },
    about: {
        label: 'О магазине',
        paths: ['/about'],
        access: 'public',
        parent: 'home',
        component: AboutShop,
        nav: { map: 'main', order: 1 }
    },
    events: {
        label: 'События',
        paths: ['/events'],
        access: 'public',
        parent: 'home',
        component: EventsMenu,
        nav: { map: 'main', order: 2, children: ['news', 'promotions'] }
    },
    news: {
        label: 'Новости',
        paths: ['/events/news'],
        access: 'public',
        parent: 'events',
        component: News
    },
    promotions: {
        label: 'Акции',
        paths: ['/events/promotions'],
        access: 'public',
        parent: 'events',
        component: Promotions
    },
    catalog: {
        label: 'Каталог товаров',
        paths: ['/catalog', '/catalog/products'],
        access: 'public',
        parent: 'home',
        component: Catalog,
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
        component: ProductDetails
    },
    delivery: {
        label: 'Доставка и оплата',
        paths: ['/delivery'],
        access: 'public',
        parent: 'home',
        component: Delivery,
        nav: { map: 'main', order: 4 }
    },
    documents: {
        label: 'Документы',
        paths: ['/documents'],
        access: 'public',
        parent: 'home',
        component: DocumentsMenu,
        nav: { map: 'main', order: 5, children: ['guarantees', 'insurance', 'licenses', 'companyDetails'] }
    },
    guarantees: {
        label: 'Гарантии',
        paths: ['/documents/guarantees'],
        access: 'public',
        parent: 'documents',
        component: Guarantees
    },
    insurance: {
        label: 'Страхование',
        paths: ['/documents/insurance'],
        access: 'public',
        parent: 'documents',
        component: Insurance
    },
    licenses: {
        label: 'Лицензии на товары',
        paths: ['/documents/licenses'],
        access: 'public',
        parent: 'documents',
        component: Licenses
    },
    companyDetails: {
        label: 'Реквизиты магазина',
        paths: ['/documents/company'],
        access: 'public',
        parent: 'documents',
        component: CompanyDetails
    },
    contacts: {
        label: 'Контакты',
        paths: ['/contacts'],
        access: 'public',
        parent: 'home',
        component: Contacts,
        nav: { map: 'main', order: 6 }
    },

    // Конфиги для пользователей с ролью admin
    adminCatalog: {
        label: 'Управление каталогом',
        paths: ['/admin/catalog'],
        access: 'admin',
        parent: 'home',
        component: CatalogManagement,
        nav: { map: 'adminDashboard', order: 0, featured: true }
    },
    adminOrders: {
        label: 'Управление заказами',
        paths: ['/admin/orders'],
        access: 'admin',
        parent: 'home',
        component: OrderManagement,
        nav: { map: 'adminDashboard', order: 1, badge: 'order-management' }
    },
    adminOrderDetails: {
        label: (
            { orderNumber }: { orderNumber: string }
        ): string => orderNumber ? `Заказ №${orderNumber}` : 'Заказ',
        generatePath: (
            { orderId, orderNumber }: { orderId: string, orderNumber: string }
        ): string => `/admin/orders/${orderNumber}~${orderId}`,
        paths: ['/admin/orders/:orderKey'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'admin',
        parent: 'adminOrders',
        component: OrderDetailsManagement
    },
    adminCustomers: {
        label: 'Клиенты и оповещения',
        paths: ['/admin/customers'],
        access: 'admin',
        parent: 'home',
        component: CustomerManagement,
        nav: { map: 'adminDashboard', order: 2 }
    },
    adminNotifications: {
        label: 'Редактор уведомлений',
        paths: ['/admin/notifications'],
        access: 'admin',
        parent: 'adminCustomers',
        component: NotificationManagement
    },
    adminEvents: {
        label: 'Редактор событий',
        paths: ['/admin/events'],
        access: 'admin',
        parent: 'home',
        component: EventManagement,
        nav: { map: 'adminDashboard', order: 3 }
    },
    adminStatistics: {
        label: 'Статистика',
        paths: ['/admin/statistics'],
        access: 'admin',
        parent: 'home',
        component: Statistics,
        nav: { map: 'adminDashboard', order: 4 }
    },
    adminPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/admin'],
        access: 'admin',
        parent: 'home',
        component: Personal,
        nav: { map: 'adminDashboard', order: 5 }
    },
    adminProfile: {
        label: 'Настройки аккаунта',
        paths: ['/admin/profile'],
        access: 'admin',
        parent: 'adminPersonal',
        component: Profile,
        nav: { map: 'adminPersonal', order: 0 }
    },
    adminErrorLogs: {
        label: 'Логи ошибок',
        paths: ['/admin/errors'],
        access: 'admin',
        parent: 'adminPersonal',
        component: ErrorLogs,
        nav: { map: 'adminPersonal', order: 1 }
    },

    // Конфиги для пользователей с ролью customer
    customerCart: {
        label: '🛒 Корзина',
        paths: ['/customer/cart'],
        access: 'customer',
        parent: 'home',
        component: Cart,
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
        component: Checkout
    },
    customerNotifications: {
        label: '🔔 Уведомления',
        paths: ['/customer/notifications'],
        access: 'customer',
        parent: 'home',
        component: CustomerNotifications,
        nav: { map: 'customerDashboard', order: 1, badge: 'notifications' }
    },
    customerPersonal: {
        label: '👤 Личный кабинет',
        paths: ['/customer'],
        access: 'customer',
        parent: 'home',
        component: Personal,
        nav: { map: 'customerDashboard', order: 2 }
    },
    customerProfile: {
        label: 'Настройки аккаунта',
        paths: ['/customer/profile'],
        access: 'customer',
        parent: 'customerPersonal',
        component: Profile,
        nav: { map: 'customerPersonal', order: 0 }
    },
    customerCheckoutPrefs: {
        label: 'Настройки заказа',
        paths: ['/customer/checkout-prefs'],
        access: 'customer',
        parent: 'customerPersonal',
        component: CheckoutPreferences,
        nav: { map: 'customerPersonal', order: 1 }
    },
    customerOrders: {
        label: 'Просмотр заказов',
        paths: ['/customer/orders'],
        access: 'customer',
        parent: 'customerPersonal',
        component: CustomerOrders,
        nav: { map: 'customerPersonal', order: 2 }
    },
    customerOrderDetails: {
        label: (
            { orderNumber }: { orderNumber: string }
        ): string => orderNumber ? `Заказ №${orderNumber}` : 'Заказ',
        generatePath: (
            { orderId, orderNumber }: { orderId: string, orderNumber: string }
        ): string => getCustomerOrderDetailsPath(orderNumber, orderId),
        paths: ['/customer/orders/:orderKey'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'customer',
        parent: 'customerOrders',
        component: CustomerOrderDetails
    },
    customerOrderCardOnlinePayment: {
        label: 'Оплата картой',
        generatePath: (
            { orderId, orderNumber }: { orderId: string, orderNumber: string }
        ): string =>
            `/customer/orders/${orderNumber}~${orderId}/payment/card-online`,
        paths: ['/customer/orders/:orderKey/payment/card-online'],
        paramSchema: { orderKey: { split: '~', map: ['orderNumber', 'orderId'] } },
        access: 'customer',
        parent: 'customerOrderDetails',
        component: CardOnlinePayment
    },

    // Конфиги для неавторизованных пользователей с доступом auth
    login: {
        label: 'Войти',
        paths: ['/login'],
        access: 'auth',
        component: LoginForm,
        nav: { map: 'guestAuth', order: 0, type: 'link' }
    },
    register: {
        label: 'Регистрация',
        paths: ['/register'],
        access: 'auth',
        component: RegistrationForm,
        nav: { map: 'guestAuth', order: 1, type: 'link' }
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

export const navigationMap = buildNavigationMap(routeConfig);

export const breadcrumbMap = buildBreadcrumbMap(routeConfig);
  