import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '../middlewares/authMiddleware.js';
import {
    handleNotificationListRequest,
    handleNotificationRequest,
    handleNotificationCreateRequest,
    handleNotificationSendingRequest,
    handleNotificationUpdateRequest,
    handleNotificationDeleteRequest,
    handleNotificationMarkAsReadRequest
} from '../controllers/notificationController.js';
import { USER_ROLE } from '../../shared/constants.js';

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get('/', verifyAuth, verifyUser, verifyRole(ADMIN, CUSTOMER), handleNotificationListRequest);
router.get('/:notificationId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNotificationRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), handleNotificationCreateRequest);
router.put('/:notificationId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNotificationUpdateRequest);
router.patch('/:notificationId/send', verifyAuth, verifyUser, verifyRole(ADMIN), handleNotificationSendingRequest);
router.patch('/:notificationId/read', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleNotificationMarkAsReadRequest);
router.delete('/:notificationId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNotificationDeleteRequest);

export default router;
