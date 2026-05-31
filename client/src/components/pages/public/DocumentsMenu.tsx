import BlockableLink from '@/components/common/BlockableLink.jsx';
import { routeConfig } from '@/config/appRouting.js';
import type { JSX } from 'react';

export default function DocumentsMenu(): JSX.Element {
    const documentRoutes = routeConfig.documents?.nav?.children ?? [];

    return (
        <div className="page-menu">
            <div className="menu-box">
                <h2>{routeConfig.documents.label}</h2>

                <ul>
                    {documentRoutes.map(route => (
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
