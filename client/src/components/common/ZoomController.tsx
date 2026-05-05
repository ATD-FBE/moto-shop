import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import useImageTracking from '@/hooks/useImageTracking.js';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IZoomControllerProps {
    zoomAnchorElem: HTMLElement;
    thumbImageElem: HTMLImageElement;
    originalImageSrc: string;
    zoomFactor?: number
}

interface IZoomState {
    x: number;
    y: number;
    w: number;
    h: number;
    initialized: boolean;
}

interface IMouseCoords {
    clientX: number;
    clientY: number;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ZoomController({
    zoomAnchorElem,
    thumbImageElem,
    originalImageSrc,
    zoomFactor = 1
}: IZoomControllerProps): JSX.Element | null {
    const [visible, setVisible] = useState(false);
    
    const [backgroundState, setBackgroundState, backgroundStateRef] = useSyncedStateWithRef<IZoomState>({
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        initialized: false
    });
    const [lensState, setLensState, lensStateRef] = useSyncedStateWithRef<IZoomState>({
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        initialized: false
    });

    const isHoveringRef = useRef(false);
    const mouseCoordsRef = useRef<IMouseCoords | null>(null);
    const zoomPreviewRef = useRef<HTMLDivElement | null>(null);

    const clamp = (val: number, min: number, max: number): number => Math.min(Math.max(val, min), max);

    const initLensSize = () => {
        const zoomPreviewElem = zoomPreviewRef.current;
        const backgroundState = backgroundStateRef.current;

        if (!thumbImageElem || !zoomPreviewElem || !backgroundState.initialized) return;

        const thumbW = thumbImageElem.offsetWidth;
        const thumbH = thumbImageElem.offsetHeight;
        const previewW = zoomPreviewElem.offsetWidth;
        const previewH = zoomPreviewElem.offsetHeight;
        const backgroundW = backgroundState.w;
        const backgroundH = backgroundState.h;

        const lensW = thumbW * (previewW / backgroundW);
        const lensH = thumbH * (previewH / backgroundH);

        setLensState(prev => ({ ...prev, w: lensW, h: lensH, initialized: true }));
    };

    const calcPositions = () => {
        const mouseCoords = mouseCoordsRef.current;
        const zoomPreviewElem = zoomPreviewRef.current;
        const lensState = lensStateRef.current;
        const backgroundState = backgroundStateRef.current;
    
        if (
            !mouseCoords ||
            !thumbImageElem ||
            !zoomPreviewElem ||
            !lensState.initialized ||
            !backgroundState.initialized
        ) return;
    
        const thumbRect = thumbImageElem.getBoundingClientRect();
        const mouseX = mouseCoords.clientX - thumbRect.left;
        const mouseY = mouseCoords.clientY - thumbRect.top;
    
        const thumbW = thumbImageElem.offsetWidth;
        const thumbH = thumbImageElem.offsetHeight;
        const previewW = zoomPreviewElem.offsetWidth;
        const previewH = zoomPreviewElem.offsetHeight;
        const lensW = lensState.w;
        const lensH = lensState.h;
        const backgroundW = backgroundState.w;
        const backgroundH = backgroundState.h;
    
        // 1) Позиция линзы на thumb-картинке
        const rawLensX = Math.round(mouseX - lensW / 2);
        const rawLensY = Math.round(mouseY - lensH / 2);
        const minLensX = 0;
        const minLensY = 0;
        const maxLensX = thumbW - lensW;
        const maxLensY = thumbH - lensH;

        const lensX = clamp(rawLensX, minLensX, maxLensX);
        const lensY = clamp(rawLensY, minLensY, maxLensY);

        setLensState(prev => ({ ...prev, x: lensX, y: lensY }));
        
        // 2) Позиция оригинальной картинки в зум-контейнере
        const relX = mouseX / thumbW;
        const relY = mouseY / thumbH;

        const rawBgX = Math.round(-(relX * backgroundW - previewW  / 2));
        const rawBgY = Math.round(-(relY * backgroundH - previewH / 2));
        const minBgX = -(backgroundW  - previewW);
        const minBgY = -(backgroundH - previewH);
        const maxBgX = 0;
        const maxBgY = 0;

        const bgX = clamp(rawBgX, minBgX, maxBgX);
        const bgY = clamp(rawBgY, minBgY, maxBgY);
        
        setBackgroundState(prev => ({ ...prev, x: bgX, y: bgY }));
    };
    
    // Использование функций хука отслеживания загрузки картинки
    const { startTracking, completeTracking } = useImageTracking();
    
    // Установка и очистка слушателей мыши на thumb-картинке
    useEffect(() => {
        if (!thumbImageElem) return;

        const handleMouseEnter = (e: MouseEvent): void => {
            isHoveringRef.current = true;
            mouseCoordsRef.current = { clientX: e.clientX, clientY: e.clientY };

            if (!backgroundStateRef.current.initialized) {
                startTracking(); // Запуск отслеживания загрузки картинки

                // Загрузка оригинальной картинки, чтобы узнать её реальные размеры
                const img = new Image();

                const handleLoadSuccess = () => {
                    completeTracking(); // Завершение отслеживания загрузки картинки при успехе
                    if (!isHoveringRef.current) return;
            
                    setBackgroundState(prev => ({
                        ...prev,
                        w: img.naturalWidth * zoomFactor,
                        h: img.naturalHeight * zoomFactor,
                        initialized: true
                    }));
                    setVisible(true);
                };

                img.onload = handleLoadSuccess;

                img.onerror = () => {
                    completeTracking(); // Завершение отслеживания загрузки картинки при ошибке
                };

                img.src = originalImageSrc;

                // Картинка загружена и находится в кэше
                if (img.complete && img.naturalWidth > 0) {
                    handleLoadSuccess();
                }
            } else {
                setVisible(true);
            }
        };

        const handleMouseMove = (e: MouseEvent): void => {
            mouseCoordsRef.current = { clientX: e.clientX, clientY: e.clientY };
            calcPositions();
        };

        const handleMouseLeave = () => {
            isHoveringRef.current = false;
            mouseCoordsRef.current = null;
            setVisible(false);
        };

        const handleScroll = () => {
            if (mouseCoordsRef.current) calcPositions();
        };

        thumbImageElem.addEventListener('mouseenter', handleMouseEnter);
        thumbImageElem.addEventListener('mousemove', handleMouseMove);
        thumbImageElem.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            thumbImageElem.removeEventListener('mouseenter', handleMouseEnter);
            thumbImageElem.removeEventListener('mousemove', handleMouseMove);
            thumbImageElem.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [thumbImageElem]);

    // Инициализация размеров линзы
    useLayoutEffect(() => {
        if (!visible) return;
        if (lensState.initialized) return;

        initLensSize();
    }, [visible, lensState.initialized]);

    // Инициализация позиций линзы и зума
    useLayoutEffect(() => {
        if (!visible) return;
        if (!lensState.initialized) return;

        calcPositions();
    }, [visible, lensState.initialized]);

    if (!visible) return null;

    return (
        <>
            {/* Линза */}
            <div
                className="zoom-lens"
                style={{
                    position: 'absolute',
                    left: `${lensState.x}px`,
                    top: `${lensState.y}px`,
                    width: `${lensState.w}px`,
                    height: `${lensState.h}px`
                }}
            />

            {/* Зум оригинальной картинки в привью */}
            {createPortal(
                <div
                    ref={zoomPreviewRef}
                    className="zoom-preview"
                    style={{
                        backgroundImage: `url(${originalImageSrc})`,
                        backgroundSize: `${backgroundState.w}px ${backgroundState.h}px`,
                        backgroundPosition: `${backgroundState.x}px ${backgroundState.y}px`,
                    }}
                />,
                zoomAnchorElem
            )}
        </>
    );
}
