import { Router } from 'express';
import {
    verifyAuth, verifyUser, verifyRole,
    optionalAuth, optionalUser, optionalRole
} from '../middlewares/authMiddleware.js';
import {
    handleNewsListRequest,
    handleNewsRequest,
    handleNewsCreateRequest,
    handleNewsUpdateRequest,
    handleNewsDeleteRequest
} from '../controllers/newsController.js';
import { USER_ROLE } from '../../shared/constants.js';

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get('/', optionalAuth, optionalUser, optionalRole(ADMIN, CUSTOMER), handleNewsListRequest);
router.get('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNewsRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), handleNewsCreateRequest);
router.put('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNewsUpdateRequest);
router.delete('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), handleNewsDeleteRequest);

export default router; 
