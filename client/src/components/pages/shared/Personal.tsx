import BlockableLink from '@/components/common/BlockableLink.jsx';
import { useAppSelector } from '@/hooks/storeHooks.js';
import { navigationMap } from '@/config/appRouting.js';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import { USER_ROLE } from '@shared/constants.js';
import type { JSX } from 'react';

export default function Personal(): JSX.Element | null {
    const { user } = useAppSelector(state => state.auth);
    const userRole = user?.role ?? USER_ROLE.GUEST;
    const personalNavItems = navigationMap[`${userRole}Personal`] || [];

    if (!user) return null;

    return (
        <div className="personal-page">
            <header className="personal-header">
                <h2>Добро пожаловать в ваш личный кабинет, {user.name}!</h2>
            </header>
            
            <div className="personal-menu-wrapper">
                <ul className="personal-menu">
                    {personalNavItems.map(navItem => (
                        <li key={navItem.paths[0] ?? '/'} className="personal-item">
                            <BlockableLink to={navItem.paths[0] ?? '/'}>
                                {typeof navItem.label === 'string' ? navItem.label : NO_VALUE_LABEL}
                                <span className="icon">▶️</span>
                            </BlockableLink>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
