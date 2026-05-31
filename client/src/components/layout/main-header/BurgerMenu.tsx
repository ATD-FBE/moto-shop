import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import MainNav from './MainNav.jsx';
import DashboardNav from './DashboardNav.jsx';
import type { JSX } from 'react';
import type { IHeaderContentProps } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TBurgerMenuProps = Pick<IHeaderContentProps,
    | 'userRole'
    | 'navigationMap'
    | 'setActiveClass'
    | 'setFeaturedClass'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function BurgerMenu({
    userRole,
    navigationMap,
    setActiveClass,
    setFeaturedClass
}: TBurgerMenuProps): JSX.Element {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const burgerMenuContainerRef = useRef<HTMLDivElement | null>(null);
    const burgerMenuRef = useRef<HTMLDivElement | null>(null);

    const hasDashboardNav = !!navigationMap[`${userRole}Dashboard`];

    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (e: MouseEvent): void => {
            if (!(e.target instanceof Node)) return;

            const target = e.target instanceof Element ? e.target : e.target.parentElement;
            if (!target) return;

            if (
                !burgerMenuContainerRef.current?.contains(target) &&
                !target.closest('.dropdown-portal')
            ) {
                setMenuOpen(false);
            }
        };
    
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    return (
        <div
            ref={burgerMenuContainerRef}
            className={cn('burger-menu-container', { 'menu-open': isMenuOpen })}
        >
            <button
                className="burger-menu-btn"
                onClick={() => setMenuOpen(prev => !prev)}
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
                <span className="icon">{isMenuOpen ? '✕' : '☰'}</span>
                <span className="title">Меню</span>
            </button>

            <div ref={burgerMenuRef} className="burger-menu">
                <MainNav
                    navigationMap={navigationMap}
                    setActiveClass={setActiveClass}
                    setFeaturedClass={setFeaturedClass}
                    burgerMenuRef={burgerMenuRef}
                />

                {hasDashboardNav && (
                    <DashboardNav
                        userRole={userRole}
                        navigationMap={navigationMap}
                        setActiveClass={setActiveClass}
                        setFeaturedClass={setFeaturedClass}
                    />
                )}
            </div>
        </div>
    );
}
