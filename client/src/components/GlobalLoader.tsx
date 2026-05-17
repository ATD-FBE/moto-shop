import { FadeLoader } from 'react-spinners';
import cn from 'classnames';
import type { JSX } from 'react';

export default function GlobalLoader(
    { visibility = true }: { visibility?: boolean }
): JSX.Element {
    return (
        <div className={cn('global-loader', { visible: visibility })}>
            <FadeLoader
                className="global-loader-spinner"
                color="rgba(138, 210, 250, 1)"
                height={32}
                width={6}
                radius={2}
                margin={12}
                speedMultiplier={1.2}
                loading={true}
            />
        </div>
    );
}
