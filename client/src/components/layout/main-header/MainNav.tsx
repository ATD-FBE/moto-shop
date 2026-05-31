import { useState, useRef } from 'react';
import cn from 'classnames';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import DropdownNav from './DropdownNav.jsx';
import type { JSX, RefObject } from 'react';
import type { IHeaderContentProps, INavItem } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TMainNavProps = Pick<IHeaderContentProps,
    | 'navigationMap'
    | 'setActiveClass'
    | 'setFeaturedClass'
> & {
    burgerMenuRef?: RefObject<HTMLDivElement | null>;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function MainNav({
    navigationMap,
    setActiveClass,
    setFeaturedClass,
    burgerMenuRef
}: TMainNavProps): JSX.Element {
    const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);

    const mainNavItems = navigationMap.main ?? [];

    const getActivePaths = (navItem: INavItem) => // Возвращает массив путей
        navItem.children 
            ? [...navItem.paths, ...navItem.children.flatMap(childNavItem => childNavItem.paths)]
            : navItem.paths;

    return (
        <nav className="main-nav">
            <ul>
                {mainNavItems.map((navItem, idx) => {
                    if (navItem.children) {
                        const navItemRef = useRef<HTMLLIElement | null>(null);

                        return (
                            <li
                                key={navItem.paths[0]}
                                ref={navItemRef}
                                className={cn('has-dropdown', setActiveClass(getActivePaths(navItem)))}
                                onMouseEnter={() => setActiveDropdownIdx(idx)}
                                onMouseLeave={() => setActiveDropdownIdx(null)}
                            >
                                <BlockableLink to={navItem.paths[0]}>
                                    {typeof navItem.label === 'string'
                                        ? navItem.label
                                        : navItem.paths[0]}
                                </BlockableLink>

                                <DropdownNav
                                    anchorRef={navItemRef}
                                    burgerMenuRef={burgerMenuRef}
                                    isShow={activeDropdownIdx === idx}
                                >
                                    <ul>
                                        {navItem.children.map(childNavItem => (
                                            <li
                                                key={childNavItem.paths[0]}
                                                className={setActiveClass(childNavItem.paths)}
                                            >
                                                <BlockableLink to={childNavItem.paths[0]}>
                                                    {typeof childNavItem.label === 'string'
                                                        ? childNavItem.label
                                                        : childNavItem.paths[0]}

                                                    {/* Бэйдж для счетчика */}
                                                    {/*childNavItem.countBadge && (
                                                        <span className="new-count"></span>
                                                    )*/}
                                                </BlockableLink>
                                            </li>
                                        ))}
                                    </ul>
                                </DropdownNav>
                            </li>
                        );
                    } else {
                        return (
                            <li
                                key={navItem.paths[0]}
                                className={cn(
                                    setFeaturedClass(navItem),
                                    setActiveClass(navItem.paths)
                                )}
                            >
                                <BlockableLink to={navItem.paths[0]}>
                                    {typeof navItem.label === 'string'
                                        ? navItem.label
                                        : navItem.paths[0]}
                                </BlockableLink>
                            </li>
                        );
                    }
                })}
            </ul>
        </nav>
    );
}
