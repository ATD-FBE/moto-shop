import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import {
    handleCategoryListRequest,
    handleCategoryCreateRequest,
    handleCategoryUpdateRequest,
    handleCategoryDeleteRequest
} from '@server/controllers/categoryController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get('/', handleCategoryListRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), handleCategoryCreateRequest);
router.put('/:categoryId', verifyAuth, verifyUser, verifyRole(ADMIN), handleCategoryUpdateRequest);
router.delete('/:categoryId', verifyAuth, verifyUser, verifyRole(ADMIN), handleCategoryDeleteRequest);

export default router;
