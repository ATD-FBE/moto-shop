import { SEC_IN_MS, USER_ROLE, REQUEST_STATUS, INTENT } from '@shared/constants.js';
import { getCssNumber } from '@/helpers/cssHelpers.js';
import type { TSubmitStates, TFieldSaveStatus } from '@/types/index.js';

export const APP_ENV = process.env.APP_ENV;
export const PROD_ENV = process.env.APP_ENV === 'production';
export const PROTOCOL = process.env.PROTOCOL;
export const HOST = process.env.HOST;
export const CLIENT_PORT = process.env.CLIENT_PORT;
export const SERVER_PORT = process.env.SERVER_PORT;
export const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;

export const ACCESS_TOKEN_BUFFER = 10 * SEC_IN_MS;
export const REFRESH_TOKEN_BUFFER = 30 * SEC_IN_MS;

export const SUCCESS_DELAY = 1.8 * SEC_IN_MS;
export const PRODUCT_AUTOSLIDE_TIMER = 5 * SEC_IN_MS;

export const LOAD_STATUS_MIN_HEIGHT = getCssNumber('--load-status-min-height', 100);
export const MODAL_ANIMATION_DURATION = getCssNumber('--modal-animation-duration', 150);
export const COLLAPSIBLE_ANIMATION_DURATION = getCssNumber('--collapsible-animation-duration', 200);

export const SCREEN_SIZE = {
    XS: 540,
    SMALL: 780,
    MEDIUM: 1180,
    LARGE: 9999
} as const;

export const DASHBOARD_TITLES = {
    [USER_ROLE.GUEST]: 'Добро пожаловать!',
    [USER_ROLE.ADMIN]: 'Панель администратора',
    [USER_ROLE.CUSTOMER]: 'Панель покупателя'
} as const;

export const AUTH_NAV_TYPE = {
    LINK: 'link',
    USER_LABEL: 'user_label',
    LOGOUT: 'logout'
} as const;

export const EXTERNAL_SCRIPT_STATUS = {
    IDLE: 'idle',
    LOADING: 'loading',
    WAITING: 'waiting',
    READY: 'ready',
    ERROR: 'error'
} as const;

export const NO_VALUE_LABEL = '---';
export const TEXT_LOG_LINE_BREAK = '\n\n';
export const CATEGORY_ROOT_LABEL = '(корень)';

export const PRODUCT_IMAGE_LOADER = '/images/product_image_loader.jpg';
export const PRODUCT_IMAGE_PLACEHOLDER = '/images/product_image_placeholder.jpg';
export const BLANK_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const CATEGORY_FORM_MODE = {
    CREATE: 'create',
    EDIT: 'edit'
} as const;

export const ORDER_DETAILS_EDIT_SECTION = {
    PAYMENT: 'payment',
    CUSTOMER_INFO: 'customer_info',
    DELIVERY: 'delivery',
    ITEMS: 'items'
} as const;

export const FIELD_UI_STATUS = {
    VALID: 'valid',
    CHANGED: 'changed',
    INVALID: 'invalid'
} as const;

export const FIELD_SAVE_STATUS = {
    SAVING: 'saving',
    SUCCESS: 'success',
    ERROR: 'error'
} as const;

export const FIELD_SAVE_STATUS_MESSAGES: Record<TFieldSaveStatus, string> = {
    [FIELD_SAVE_STATUS.SAVING]: '⏳ Сохранение...',
    [FIELD_SAVE_STATUS.SUCCESS]: '✅ Сохранено!',
    [FIELD_SAVE_STATUS.ERROR]: '❌ Ошибка сохранения'
} as const;

export const DATA_LOAD_STATUS = {
    SKIPPED: 'skipped',
    LOADING: 'loading',
    ERROR: 'error',
    NOT_FOUND: 'not_found',
    READY: 'ready'
} as const;

export const FORM_STATUS = {
    DEFAULT: 'default',
    LOADING: 'loading',
    LOAD_ERROR: 'load_error',
    CANCELING: 'canceling',
    CANCEL_ERROR: 'cancel_error',
    CANCEL_SUCCESS: 'cancel_success',
    SENDING: 'sending',
    ...REQUEST_STATUS,
    UNKNOWN: 'unknown'
} as const;

export const BASE_SUBMIT_STATES: TSubmitStates = {
    [FORM_STATUS.DEFAULT]: {
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить'
    },
    [FORM_STATUS.LOADING]: {
        icon: '⏳',
        mainMessage: 'Загрузка данных...',
        submitBtnLabel: 'Загрузка...',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEUTRAL,
        locked: true
    },
    [FORM_STATUS.LOAD_ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось загрузить данные.',
        addMessage: 'Попробуйте повторить загрузку:',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.CANCELING]: {
        icon: '⏳',
        mainMessage: 'Выполняется отмена...',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Отмена...',
        intent: INTENT.NEUTRAL,
        locked: true
    },
    [FORM_STATUS.CANCEL_ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось отменить операцию.',
        addMessage: 'Попробуйте повторить снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.CANCEL_SUCCESS]: {
        icon: '❎',
        mainMessage: 'Операция отменена!',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Отменено',
        intent: INTENT.WARNING,
        locked: true
    },
    [FORM_STATUS.SENDING]: {
        submitBtnLabel: 'Отправка...',
        cancelBtnLabel: 'Недоступно',
        locked: true
    },
    [FORM_STATUS.UNAUTH]: {
        icon: '⏰',
        mainMessage: 'Сессия истекла.',
        addMessage: 'Требуется повторный вход. Несохранённые данные будут утрачены.',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.USER_GONE]: {
        icon: '🗑️',
        mainMessage: 'Аккаунт пользователя удалён!',
        addMessage: 'Соболезнуем. Нужна новая авторизация.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.DENIED]: {
        icon: '⛔',
        mainMessage: 'Доступ запрещён!',
        addMessage: 'Недостаточно прав для выполнения действия.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.FORBIDDEN]: {
        icon: '⛔',
        mainMessage: 'Операция невозможна',
        addMessage: 'Нет доступа к ресурсу в текущем состоянии.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.BAD_REQUEST]: {
        icon: '⚠️',
        mainMessage: 'Некорректный запрос.',
        addMessage: 'Отправленные данные не прошли проверку.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.NOT_FOUND]: {
        icon: '🚫',
        mainMessage: 'Исходные данные не найдены.',
        addMessage: 'Изменения невозможны.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.NO_SELECTION]: {
        icon: '⚠️',
        mainMessage: 'Элементы не выбраны.',
        addMessage: 'Данные не изменены.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.CONFLICT]: {
        icon: '⚠️',
        mainMessage: 'Конфликт данных.',
        addMessage: 'Действие невозможно из-за расхождения состояния ресурса.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.LIMITATION]: {
        icon: '⚠️',
        mainMessage: 'Ограничение на операцию.',
        addMessage: 'Условие для выполнения действия не соблюдено.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.MODIFIED]: {
        icon: '🔄',
        mainMessage: 'Данные изменились.',
        addMessage: 'Проверьте обновлённые значения и отправьте снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.UNCHANGED]: {
        icon: 'ℹ️',
        mainMessage: 'Изменений нет.',
        addMessage: 'Данные не изменены.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.INVALID]: {
        icon: '⚠️',
        mainMessage: 'Некорректные данные.',
        addMessage: 'Исправьте ошибки в форме.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось выполнить запрос.',
        addMessage: 'Ошибка сервера. Попробуйте снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.TIMEOUT]: {
        icon: '⏰',
        mainMessage: 'Не удалось выполнить запрос.',
        addMessage: 'Время ожидания истекло.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.ABORTED]: {
        icon: '🚫',
        mainMessage: 'Запрос прерван.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.PARTIAL]: {
        icon: '✅⚠️',
        mainMessage: 'Частичное обновление.',
        addMessage: 'Не все данные были изменены.',
        submitBtnLabel: 'Выполнено',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.POSITIVE,
        locked: true
    },
    [FORM_STATUS.SUCCESS]: {
        icon: '✅',
        mainMessage: 'Данные отправлены!',
        submitBtnLabel: 'Выполнено',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.POSITIVE,
        locked: true
    },
    [FORM_STATUS.UNKNOWN]: {
        icon: '❓',
        mainMessage: 'Статус не определён.',
        addMessage: 'Уточните состояние операции в консоли или у администратора.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    }
} as const;
