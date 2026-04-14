import { Router } from 'express';
import {
    verifyAuth, verifyUser, verifyRole,
    optionalAuth, optionalUser
} from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validatorMiddleware.js';
import {
    newsSchema,
    newsCreateSchema,
    newsUpdateSchema,
    newsDeleteSchema
} from '@server/validation/news.schemas.js';
import {
    handleNewsListRequest,
    handleNewsRequest,
    handleNewsCreateRequest,
    handleNewsUpdateRequest,
    handleNewsDeleteRequest
} from '@server/controllers/newsController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get('/', optionalAuth, optionalUser, handleNewsListRequest);
router.get('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), validateInput(newsSchema), handleNewsRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), validateInput(newsCreateSchema), handleNewsCreateRequest);
router.put('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), validateInput(newsUpdateSchema), handleNewsUpdateRequest);
router.delete('/:newsId', verifyAuth, verifyUser, verifyRole(ADMIN), validateInput(newsDeleteSchema), handleNewsDeleteRequest);

export default router; 
