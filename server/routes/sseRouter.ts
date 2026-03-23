import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import {
    handleSseNotificationsRequest,
    handleSseOrderManagementRequest
} from '@server/controllers/sseController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get('/notifications', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleSseNotificationsRequest);
router.get('/order-management', verifyAuth, verifyUser, verifyRole(ADMIN), handleSseOrderManagementRequest);

export default router;
