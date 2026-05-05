import cn from 'classnames';
import ProductImageGallery from '../ProductImageGallery.js';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import { NO_VALUE_LABEL, DATA_LOAD_STATUS } from '@/config/constants.js';
import type { JSX, ComponentProps } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductImageGallery>;

type TImageThumbnailsProps = Pick<TParentProps,
    | 'loadStatus'
    | 'images'
    | 'title'
    | 'reloadData'
> & {
    currentIdx: number;
    onSelect: (idx: number) => void;
};

interface IProductsLoadStatusData {
    icon: string;
    iconClass: string;
    text: string;
    reloadBtn?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const PRODUCTS_LOAD_STATUS_MAP: Partial<Record<TDataLoadStatus, IProductsLoadStatusData>> = {
    [DATA_LOAD_STATUS.LOADING]: {
        icon: '⏳',
        iconClass: 'load',
        text: 'Загрузка данных товара...'
    },
    [DATA_LOAD_STATUS.ERROR]: {
        icon: '❌',
        iconClass: 'error',
        text: 'Ошибка сервера. Данные товара не доступны.',
        reloadBtn: true
    },
    [DATA_LOAD_STATUS.READY]: {
        icon: '✅',
        iconClass: 'ready',
        text: 'Данные товара загружены.'
    }
} as const;

export default function ImageThumbnails({
    loadStatus,
    images,
    currentIdx,
    title,
    reloadData,
    onSelect
}: TImageThumbnailsProps): JSX.Element {
    const loadStatusData = PRODUCTS_LOAD_STATUS_MAP[loadStatus];

    if (loadStatus !== DATA_LOAD_STATUS.READY || !images.length) {
        return (
            <div className="thumbnails">
                <div className="product-details-load-status">
                    <p>
                        <span className={cn('icon', loadStatusData?.iconClass || '')}>
                            {loadStatusData?.icon || ''}
                        </span>
                        {loadStatusData?.text || NO_VALUE_LABEL}
                    </p>

                    {loadStatusData?.reloadBtn && (
                        <button className="reload-btn" onClick={reloadData} aria-label="Перезагрузить">
                            Повторить
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="thumbnails">
            {images.map((img, idx) => (
                <button
                    key={idx}
                    className={cn('image-thumb', { 'current': idx === currentIdx })}
                    onClick={() => onSelect(idx)}
                    aria-label={`${title}, выбрать привью изображения номер ${idx + 1}`}
                >
                    <TrackedImage
                        className="thumb-img"
                        src={img.original}
                        alt={`${title} (миниатюра ${idx + 1})`}
                    />
                </button>
            ))}
        </div>
    );
}
