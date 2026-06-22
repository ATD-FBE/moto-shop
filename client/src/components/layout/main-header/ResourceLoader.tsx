import { MoonLoader } from 'react-spinners';
import cn from 'classnames';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import { useAppSelector } from '@/hooks/storeHooks.js';
import type { JSX } from 'react';

export default function ResourceLoader(): JSX.Element {
    const {
        activePageRequests,
        activeApiRequests,
        activeMediaRequests
    } = useAppSelector(state => state.loading);
    const isLoading = activePageRequests > 0 || activeApiRequests > 0 || activeMediaRequests > 0;

    return (
        <div className="resource-loader">
            <TrackedImage
                className={cn('logo-image', { 'visible': !isLoading })}
                src="/images/logo.png"
                alt="Header Logo"
            />

            <MoonLoader
                className={cn('resource-loader-spinner', { 'visible': isLoading })}
                color="rgb(25, 100, 195)"
                size={36}
                speedMultiplier={1}
                loading={true}
            />
        </div>
    );
}
