import { pipeline } from 'stream';
import { generateCompanyDetailsPdf } from '@server/services/companyService.js';
import type { RequestHandler } from 'express';

export const handleCompanyDetailsPdfRequest: RequestHandler = (_req, res, next) => {
    try {
        const { pdfDoc, filename } = generateCompanyDetailsPdf();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition', 
            `attachment; filename="company_details.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );

        pipeline(pdfDoc, res, (err) => {
            if (err) next(err);
        });
        
        pdfDoc.end();
    } catch (err) {
        next(err);
    }
};

// Декодировать имя файла на клиенте не нужно, это делает браузер
