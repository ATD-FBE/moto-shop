import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '../middlewares/authMiddleware.js';
import {
    handleCustomerListRequest,
    handleCustomerOrderListRequest,
    handleCustomerDiscountUpdateRequest,
    handleCustomerBanToggleRequest
} from '../controllers/customerController.js';
import { USER_ROLE } from '../../shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get('/', verifyAuth, verifyUser, verifyRole(ADMIN), handleCustomerListRequest);
router.get('/:customerId/orders', verifyAuth, verifyUser, verifyRole(ADMIN), handleCustomerOrderListRequest);
router.patch('/:customerId/discount', verifyAuth, verifyUser, verifyRole(ADMIN), handleCustomerDiscountUpdateRequest);
router.patch('/:customerId/ban', verifyAuth, verifyUser, verifyRole(ADMIN), handleCustomerBanToggleRequest);

export default router;
