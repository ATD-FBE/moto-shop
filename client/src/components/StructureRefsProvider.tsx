import { createContext, useRef } from 'react';
import type { JSX, ReactNode } from 'react';
import type { IStructureRefsContext } from '@/types/index.js';

// Создание контекста и провайдера для рефов, которые нужно пробросить в любой дочерний компонент
export const StructureRefsContext = createContext<IStructureRefsContext | null>(null);

export default function StructureRefsProvider (
    { children }: { children: ReactNode }
): JSX.Element {
    const mainHeaderRef = useRef<HTMLElement | null>(null);
    const mainFooterRef = useRef<HTMLElement | null>(null);

    return (
        <StructureRefsContext.Provider value={{ mainHeaderRef, mainFooterRef }}>
            {children}
        </StructureRefsContext.Provider>
    );
}
