import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    notificationListSchema,
    notificationSchema,
    notificationCreateSchema,
    notificationUpdateSchema,
    notificationSendingSchema,
    notificationMarkAsReadSchema,
    notificationDeleteSchema
} from '@server/validation/schemas/notification.schemas.js';
import {
    handleNotificationListRequest,
    handleNotificationRequest,
    handleNotificationCreateRequest,
    handleNotificationSendingRequest,
    handleNotificationUpdateRequest,
    handleNotificationDeleteRequest,
    handleNotificationMarkAsReadRequest
} from '@server/controllers/notificationController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN, CUSTOMER),
    validateInput(notificationListSchema),
    handleNotificationListRequest
);
router.get(
    '/:notificationId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(notificationSchema),
    handleNotificationRequest
);
router.post(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(notificationCreateSchema),
    handleNotificationCreateRequest
);
router.put(
    '/:notificationId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(notificationUpdateSchema),
    handleNotificationUpdateRequest
);
router.patch(
    '/:notificationId/send',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(notificationSendingSchema),
    handleNotificationSendingRequest
);
router.patch(
    '/:notificationId/read',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(notificationMarkAsReadSchema),
    handleNotificationMarkAsReadRequest
);
router.delete(
    '/:notificationId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(notificationDeleteSchema),
    handleNotificationDeleteRequest
);

export default router;
