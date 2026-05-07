import { useState, useRef } from 'react';
import cn from 'classnames';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import type { JSX, DragEvent } from 'react';
import { IImageUpload } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IImageUploaderProps {
    images: IImageUpload[];
    onZoom: (idx: number) => void;
    onMainSelect: (targetIdx: number) => void;
    onDeleteToggle: (targetIdx: number) => void;
    onFilesDropped: (files: File[]) => void
    onAddFilesClick: () => void;
    uiBlocked: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ImageUploader({
    images,
    onZoom,
    onMainSelect,
    onDeleteToggle,
    onFilesDropped,
    onAddFilesClick,
    uiBlocked
}: IImageUploaderProps): JSX.Element {
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounterRef = useRef(0);

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        dragCounterRef.current += 1;
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (!dragCounterRef.current) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        if (uiBlocked) return;

        dragCounterRef.current = 0;
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length) {
            onFilesDropped(files);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div
            className={cn('image-uploader-grid', { 'drag-active': isDragOver && !uiBlocked })}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Показ миниатюр */}
            {images.map((img, idx) => (
                <div
                    key={idx}
                    className={cn(
                        'image-thumb',
                        { 'new': img.type === 'new' },
                        { 'main': img.main },
                        { 'faded': img.markedForDeletion },
                        { 'invalid': img.invalid }
                    )}
                >
                    <TrackedImage
                        className="thumb-img"
                        src={img.previewUrl}
                        alt={`${img.title} (миниатюра ${idx + 1})`}
                        onClick={() => onZoom(idx)}
                        aria-label="Просмотр изображения в масштабе"
                    />
            
                    <div className="checkbox-wrapper select-main">
                        <DesignedCheckbox
                            checked={img.main}
                            onChange={() => !img.main && onMainSelect(idx)}
                            disabled={uiBlocked || img.markedForDeletion || img.invalid}
                        />
                    </div>
            
                    <div className="checkbox-wrapper delete">
                        <DesignedCheckbox
                            checkIcon="❌"
                            checkIconColor="red"
                            checked={img.markedForDeletion}
                            onChange={() => onDeleteToggle(idx)}
                            disabled={uiBlocked}
                        />
                    </div>
                </div>
            ))}
        
            {/* Кнопка для добавления новых картинок */}
            <button
                type="button"
                className={cn('add-thumb-btn', { 'drag-active': isDragOver && !uiBlocked })}
                aria-label="Добавить фото товара"
                onClick={onAddFilesClick}
                disabled={uiBlocked}
            >
                <span className="icon">➕</span>
            </button>
        </div>
    );
}
