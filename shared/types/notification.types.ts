import type { TNotificationStatus } from './shared.types.js';
import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TValidationErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';

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

/// Загрузка всех уведомлений (для управления админом или просмотра клиентом) ///
export interface INotificationListQuery {
    page?: string;
    limit?: string;
    sort?: string;
}

interface INotificationListSuccessData {
    notificationsCount: number;
    paginatedNotificationList: INotification[];
}
export type TNotificationListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationListSuccessData>;

/// Загрузка черновика уведомления для редактирования ///
interface INotificationSuccessData {
    notification: INotification;
}
export type TNotificationResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationSuccessData>;

/// Создание черновика уведомления ///
export type TNotificationCreateResponse =
    | TAuthErrorResponse
    | TValidationErrorResponse<'notification'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Изменение черновика уведомления ///
export type TNotificationUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TValidationErrorResponse<'notification'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Отправка уведомления ///
interface INotificationSendingSuccessData {
    updatedNotificationData: {
        status: TNotificationStatus;
        sentAt: string;
        sentBy: string;
    }
}
export type TNotificationSendingResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationSendingSuccessData>;

/// Отметка уведомления как прочитанного ///
interface INotificationMarkAsReadSuccessData {
    updatedNotificationData: {
        isRead: boolean;
        readAt: string;
    }
}
export type TNotificationMarkAsReadResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INotificationMarkAsReadSuccessData>;
    
/// Удаление черновика уведомления ///
export type TNotificationDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
