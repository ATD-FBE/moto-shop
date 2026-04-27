import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    categoryCreateSchema,
    categoryUpdateSchema,
    categoryDeleteSchema
} from '@server/validation/schemas/category.schemas.js';
import {
    handleCategoryListRequest,
    handleCategoryCreateRequest,
    handleCategoryUpdateRequest,
    handleCategoryDeleteRequest
} from '@server/controllers/categoryController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get(
    '/',
    handleCategoryListRequest
);
router.post(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(categoryCreateSchema),
    handleCategoryCreateRequest
);
router.put(
    '/:categoryId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(categoryUpdateSchema),
    handleCategoryUpdateRequest
);
router.delete(
    '/:categoryId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(categoryDeleteSchema),
    handleCategoryDeleteRequest
);

export default router;
