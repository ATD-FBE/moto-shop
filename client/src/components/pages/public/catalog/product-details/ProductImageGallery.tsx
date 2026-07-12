import { useState, useRef, useEffect } from 'react';
import ImageSlider from './product-image-gallery/ImageSlider.jsx';
import ImageThumbnails from './product-image-gallery/ImageThumbnails.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { openImageViewerModal } from '@/services/modalImageViewerService.js';
import {
    DATA_LOAD_STATUS,
    PRODUCT_IMAGE_LOADER,
    PRODUCT_IMAGE_PLACEHOLDER,
    PRODUCT_AUTOSLIDE_TIMER
} from '@/config/constants.js';
import type { JSX } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';
import type { IProductImage } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductImageGalleryProps {
    loadStatus: TDataLoadStatus;
    images: IProductImage[];
    mainImageIndex: number;
    title: string;
    reloadData: () => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductImageGallery({
    loadStatus,
    images,
    mainImageIndex,
    title,
    reloadData
}: IProductImageGalleryProps): JSX.Element {
    const [currentThumbIdx, setCurrentThumbIdx] = useState(mainImageIndex);
    const sliderTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const dispatch = useAppDispatch();

    const isReady = loadStatus === DATA_LOAD_STATUS.READY;
    const hasProductImage = isReady && images.length > 0;

    const currentImageSrc = isReady
        ? images[currentThumbIdx]?.original ?? PRODUCT_IMAGE_PLACEHOLDER
        : PRODUCT_IMAGE_LOADER;
    const currentImageAlt = hasProductImage ? title : '';

    const startAutoSlide = (): void => {
        sliderTimerRef.current = setInterval(() => {
            setCurrentThumbIdx(prev => (prev + 1) % images.length);
        }, PRODUCT_AUTOSLIDE_TIMER);
    };

    const reStartAutoSlide = (): void => {
        clearInterval(sliderTimerRef.current);
        startAutoSlide();
    };

    const slideImagesBackward = (): void => {
        if (images.length <= 1) return;

        reStartAutoSlide();
        setCurrentThumbIdx(prev => (prev - 1 + images.length) % images.length);
    };

    const slideImagesForward = (): void => {
        if (images.length <= 1) return;

        reStartAutoSlide();
        setCurrentThumbIdx(prev => (prev + 1) % images.length);
    };

    const selectThumbImage = (idx: number): void => {
        if (images.length <= 1) return;

        reStartAutoSlide();
        setCurrentThumbIdx(idx);
    };

    const handleSliderImageClick = (): void => {
        clearInterval(sliderTimerRef.current);

        dispatch(openImageViewerModal({
            images: images.map(img => ({ url: img.original, title })),
            initialIndex: currentThumbIdx,
            ...(images.length > 1 && {
                onClose: (currentIdx) => {
                    setCurrentThumbIdx(currentIdx);
                    startAutoSlide();
                }
            })
        }));
    };

    // Обновление главного индекса после загрузки товара
    useEffect(() => {
        setCurrentThumbIdx(mainImageIndex);
    }, [mainImageIndex]);

    // Старт таймера автопрокрутки слайдера и его очистка при размонтировании компонента
    useEffect(() => {
        if (images.length <= 1) return;

        startAutoSlide();
        return () => clearInterval(sliderTimerRef.current);
    }, [images]);

    return (
        <div className="product-image-gallery">
            <ImageSlider
                currentImageSrc={currentImageSrc}
                currentImageAlt={currentImageAlt}
                onNext={slideImagesForward}
                onPrev={slideImagesBackward}
                onImageClick={handleSliderImageClick}
                uiBlocked={!hasProductImage}
            />

            <ImageThumbnails
                loadStatus={loadStatus}
                images={images}
                currentIdx={currentThumbIdx}
                title={title}
                reloadData={reloadData}
                onSelect={selectThumbImage}
            />
        </div>
    );
}
