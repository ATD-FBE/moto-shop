import { Router } from 'express';
import {
    handleCompanyDetailsPdfRequest
} from '@server/controllers/companyController.js';

const router: Router = Router();

router.get(
    '/details/pdf',
    handleCompanyDetailsPdfRequest
);

export default router;
