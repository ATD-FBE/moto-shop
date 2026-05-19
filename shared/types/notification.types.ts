import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type {
    TNotificationStatus,
    IBaseQuery,
    TNotificationsSortOption
} from './shared.types.js';

/// Общие типы ///
export interface INotification {
    id: string;
    status?: TNotificationStatus;
    recipients?: string[];
    subject: string;
    message: string;
    signature: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
    sentBy?: string;
    sentAt: string | null;
    isRead?: boolean;
    readAt?: string | null;
}

export interface INotificationBody {
    recipients: string[];
    subject: string;
    message: string;
    signature: string;
}

/// Загрузка списка уведомлений для одной страницы (управление админом или просмотр клиентом) ///
export type TNotificationListQuery = IBaseQuery<TNotificationsSortOption['dbField']>;

export type TNotificationListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationListSuccessData>;

interface INotificationListSuccessData {
    notificationsCount: number;
    paginatedNotificationList: INotification[];
}

/// Загрузка черновика уведомления для редактирования ///
export type TNotificationResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationSuccessData>;

interface INotificationSuccessData {
    notification: INotification;
}

/// Создание черновика уведомления ///
export type TNotificationCreateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'notification'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Изменение черновика уведомления ///
export type TNotificationUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'notification'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Отправка уведомления ///
export type TNotificationSendingResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationSendingSuccessData>;

interface INotificationSendingSuccessData {
    notificationUpdateData: {
        status: TNotificationStatus;
        sentAt: string;
        sentBy: string;
    }
}

/// Отметка уведомления как прочитанного ///
export type TNotificationMarkAsReadResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationMarkAsReadSuccessData>;

interface INotificationMarkAsReadSuccessData {
    notificationUpdateData: {
        isRead: boolean;
        readAt: string;
    }
}
    
/// Удаление черновика уведомления ///
export type TNotificationDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
