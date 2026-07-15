import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import parseHTML from 'html-react-parser';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import { wasLastInputKeyboard } from '@/helpers/inputMethod.js';
import { getAlertModalActions, closeAlertModal } from '@/services/modalAlertService.js';
import { MODAL_ANIMATION_DURATION } from '@/config/constants.js';
import type { JSX } from 'react';

const parse = (parseHTML as any).default || parseHTML;

const ALERT_ICON_BY_TYPE = {
    info: '❕',
    warn: '⚠️',
    error: '❌'
} as const;

const appRoot = document.getElementById('app');
const modalPortalRoot = document.getElementById('modal-root') || document.body;

export default function AlertModal(): JSX.Element | null {
    const {
        isOpen,
        type = 'info', // 'info', 'warn', 'error'
        dismissible = true,
        title = '',
        message = '',
        dismissBtnLabel = 'OK'
    } = useAppSelector(state => state.modalAlert);

    const [isVisible, setIsVisible, isVisibleRef] = useSyncedStateWithRef(false); // Анимация
    const [isDisabled, setIsDisabled, isDisabledRef] = useSyncedStateWithRef(false);

    const modalRef = useRef<HTMLDivElement | null>(null);
    const isClosingRef = useRef(false);
    const lastFocusedElemRef = useRef<Element | null>(null);
    const fallbackCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const dispatch = useAppDispatch();

    const { onClose } = getAlertModalActions();

    const startFallbackCloseTimer = () => {
        clearFallbackCloseTimer(); 
        
        // Фоллбэк для закрытия модалки, если анимация закрытия не началась
        fallbackCloseTimer.current = setTimeout(finalizeClose, MODAL_ANIMATION_DURATION + 30);
    };

    const clearFallbackCloseTimer = (): void => {
        if (fallbackCloseTimer.current !== undefined) {
            clearTimeout(fallbackCloseTimer.current);
            fallbackCloseTimer.current = undefined;
        }
    };

    const finalizeClose = (): void => {
        if (!isClosingRef.current) return;

        isClosingRef.current = false;

        clearFallbackCloseTimer();
        dispatch(closeAlertModal());
        onClose?.();

        appRoot?.removeAttribute('inert'); // До фокуса на сохранённом активном элементе
        if (lastFocusedElemRef.current instanceof HTMLElement) lastFocusedElemRef.current.focus();
        lastFocusedElemRef.current = null;
    };
    
    const handleClose = (): void => {
        if (isDisabledRef.current) return;
        if (isClosingRef.current) return;

        isClosingRef.current = true;

        setIsDisabled(true);
        setIsVisible(false);
        startFallbackCloseTimer();
    };

    // Включение/отключение анимации при открытии/закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            if (!isVisible) return;

            setIsDisabled(true);
            setIsVisible(false);
            startFallbackCloseTimer();
            return;
        }

        clearFallbackCloseTimer();
        appRoot?.setAttribute('inert', '');
        setIsDisabled(false);
        setIsVisible(true);
    }, [isOpen]);

    // Вызовы опциональных коллбэков и очистка после анимации закрытия окна
    useEffect(() => {
        if (!isOpen) return;

        const modal = modalRef.current;
        if (!modal) return;
    
        const onTransitionEnd = (e: TransitionEvent): void => {
            if (e.target === modal && e.propertyName === 'opacity' && !isVisibleRef.current) {
                finalizeClose();
            }
        };
    
        modal.addEventListener('transitionend', onTransitionEnd);
        return () => modal.removeEventListener('transitionend', onTransitionEnd);
    }, [isOpen]);

    // Сохранение активного элемента и фокус на кнопке модалки, если ввод был через клавиатуру
    useEffect(() => {
        if (!isOpen) return;

        const modal = modalRef.current;
        if (!modal) return;
        if (!wasLastInputKeyboard()) return;
    
        lastFocusedElemRef.current = document.activeElement;

        const dismissBtn = modal.querySelector('button.dismiss-btn:not([disabled])');
        if (dismissBtn instanceof HTMLElement) dismissBtn.focus();
    }, [isOpen]);

    // Закрытие модального окна через Escape
    useEffect(() => {
        if (!isVisible) return;
    
        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') handleClose();
        }
    
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isVisible]);

    if (!isOpen && !isVisible) return null;
  
    return createPortal(
        <div
            ref={modalRef}
            className={cn('modal-backdrop-portal', { 'visible' : isVisible })}
            onClick={dismissible ? handleClose : undefined}
        >
            <div
                className={cn('alert-modal', type)}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="title">
                    <span className="icon">{ALERT_ICON_BY_TYPE[type] ?? ''}</span>
                    {title}
                </h3>

                <div className="message">
                    {message.split(/\r?\n/).map((paragraph, idx) =>
                        paragraph
                            ? <p key={`modal-message-${idx}`}>{parse(paragraph)}</p>
                            : <br key={`modal-message-${idx}`} />
                    )}
                </div>

                <div className="button-box">
                    <button
                        className="dismiss-btn"
                        onClick={handleClose}
                        disabled={isDisabled}
                        aria-label="ОК"
                        data-testid="dismiss-modal-btn"
                    >
                        <span className="icon">✅</span>
                        {dismissBtnLabel}
                    </button>
                </div>
            </div>
        </div>,
        
        modalPortalRoot
    );
}
