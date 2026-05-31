import TrackedImage from '@/components/common/TrackedImage.jsx';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import type { JSX } from 'react';

export default function MainTitle(): JSX.Element {
    return (
        <div className="main-title">
            <TrackedImage
                className="main-title-background-image"
                src="/images/header_title_background.png"
                alt="Header Title Background"
            />

            <h1><BlockableLink to="/">Мото-Магазин</BlockableLink></h1>
        </div>
    );
}
