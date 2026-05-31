import BlockableLink from '@/components/common/BlockableLink.jsx';
import { routeConfig } from '@/config/appRouting.js';
import type { JSX } from 'react';

export default function EventsMenu(): JSX.Element {
    const eventRoutes = routeConfig.events?.nav?.children ?? [];

    return (
        <div className="page-menu">
            <div className="menu-box">
                <h2>{routeConfig.events.label}</h2>

                <ul>
                    {eventRoutes.map(route => (
                        <li key={routeConfig[route].paths[0]}>
                            <BlockableLink to={routeConfig[route].paths[0]}>
                                {routeConfig[route].label}
                            </BlockableLink>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
