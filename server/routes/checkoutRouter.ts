import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import {
    handleOrderDraftRequest,
    handleOrderDraftCreateRequest,
    handleOrderDraftConfirmRequest,
    handleOrderDraftUpdateRequest,
    handleOrderDraftDeleteRequest
} from '@server/controllers/checkoutController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { CUSTOMER } = USER_ROLE;

router.post('/:orderId/prepare', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleOrderDraftRequest);
router.post('/:orderId/confirm', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleOrderDraftConfirmRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleOrderDraftCreateRequest);
router.patch('/:orderId', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleOrderDraftUpdateRequest);
router.delete('/:orderId', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleOrderDraftDeleteRequest);

export default router;
