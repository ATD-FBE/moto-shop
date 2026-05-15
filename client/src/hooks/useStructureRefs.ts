import { useContext } from 'react';
import { StructureRefsContext } from '@/components/StructureRefsContext.jsx';
import type { IStructureRefsContext } from '@/types/index.js';

export const useStructureRefs = (): IStructureRefsContext => {
    const context = useContext(StructureRefsContext);
    if (!context) {
        throw new Error('useStructureRefs должен использоваться с StructureRefsProvider');
    }
    return context;
};
