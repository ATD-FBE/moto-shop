import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '../middlewares/authMiddleware.js';
import {
    handleCartItemListRequest,
    handleGuestCartItemListRequest,
    handleCartItemRestoreRequest,
    handleCartItemUpdateRequest,
    handleCartWarningsFixRequest,
    handleCartItemRemoveRequest,
    handleCartClearRequest
} from '../controllers/cartController.js';
import { USER_ROLE } from '../../shared/constants.js';

const router: Router = Router();
const { CUSTOMER } = USER_ROLE;

router.get('/', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartItemListRequest);
router.post('/guest', handleGuestCartItemListRequest);
router.post('/items/restore/:productId', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartItemRestoreRequest);
router.put('/items/:productId', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartItemUpdateRequest);
router.patch('/warnings', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartWarningsFixRequest);
router.delete('/items/:productId', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartItemRemoveRequest);
router.delete('/clear', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleCartClearRequest);

export default router;
