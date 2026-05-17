import GlobalRedirect from '@/components/route-guard/GlobalRedirect.jsx';
import ProtectedRoute from '@/components/route-guard/ProtectedRoute.jsx';
import ProtectedPageContent from '@/components/route-guard/ProtectedPageContent.jsx';
import type { JSX } from 'react';
import type { TRouteConfig } from '@/types/index.js';

export default function RouteGuard(
    { access }: { access: TRouteConfig[keyof TRouteConfig]['access']}
): JSX.Element {
    return (
        <GlobalRedirect>
            <ProtectedRoute access={access}>
                <ProtectedPageContent />
            </ProtectedRoute>
        </GlobalRedirect>
    );
}
