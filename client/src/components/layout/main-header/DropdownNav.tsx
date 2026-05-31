import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { useStructureRefs } from '@/hooks/useStructureRefs.js';
import type { JSX, ReactNode, RefObject } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IDropdownNavProps {
    anchorRef: RefObject<HTMLLIElement | null>;
    burgerMenuRef?: RefObject<HTMLDivElement | null>;
    isShow: boolean;
    children: ReactNode;
}

interface IDropdownPosition {
    top: number;
    left: number;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const dropdownPortalRoot = document.getElementById('dropdown-root') || document.body;

export default function DropdownNav({
    anchorRef,
    burgerMenuRef,
    isShow,
    children
}: IDropdownNavProps): JSX.Element {
    const [position, setPosition] = useState<IDropdownPosition>({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const { mainHeaderRef } = useStructureRefs();

    const updatePosition = (): void => {
        if (!anchorRef.current) return;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const isBurgerMenu = !!burgerMenuRef?.current;

        let top = isBurgerMenu ? anchorRect.top : anchorRect.bottom;
        let left = isBurgerMenu ? anchorRect.right : anchorRect.left;

        if (isBurgerMenu) {
            const viewportHeight = window.innerHeight;
            const headerHeight = mainHeaderRef.current?.offsetHeight ?? 0;
            const dropdownHeight = dropdownRef.current?.offsetHeight ?? 0;

            if (top < headerHeight) {
                top = headerHeight;
            }
            if (top + dropdownHeight > viewportHeight) {
                top = viewportHeight - dropdownHeight;
            }
        }

        setPosition({ top, left });
    };
  
    useEffect(() => {
        if (!anchorRef.current || !isShow) return;

        updatePosition();

        const burgerMenu = burgerMenuRef?.current;

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        burgerMenu?.addEventListener('scroll', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
            burgerMenu?.removeEventListener('scroll', updatePosition);
        };
    }, [anchorRef, burgerMenuRef, isShow]);
  
    return createPortal(
        <div
            ref={dropdownRef}
            className={cn('dropdown-portal', { 'show': isShow })}
            style={{
                left: position.left,
                top: position.top
            }}
        >
            {children}
        </div>,

        dropdownPortalRoot
    );
}
