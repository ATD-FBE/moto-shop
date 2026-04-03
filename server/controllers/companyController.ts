import { generateCompanyDetailsPdf } from '@server/services/companyService.js';
import { toError } from '@shared/commonHelpers.js';
import type { RequestHandler } from 'express';

export const handleCompanyDetailsPdfRequest: RequestHandler = (_req, res, next) => {
    try {
        const { pdfDoc, filename } = generateCompanyDetailsPdf();

        pdfDoc.on('error', (err) => {
            return next(err); 
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition', 
            `attachment; filename="company_details.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
        
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (err) {
        next(toError(err));
    }
};

// Декодировать имя файла на клиенте не нужно, браузер сам всё сделает
