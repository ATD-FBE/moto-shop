import { Router } from 'express';
import {
    handleCompanyDetailsPdfRequest
} from '../controllers/companyController.js';

const router: Router = Router();

router.get('/details/pdf', handleCompanyDetailsPdfRequest);

export default router;
