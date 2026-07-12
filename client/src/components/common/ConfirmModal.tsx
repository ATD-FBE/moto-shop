import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import parseHTML from 'html-react-parser';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import { wasLastInputKeyboard } from '@/helpers/inputMethod.js';
import { getConfirmModalActions, closeConfirmModal } from '@/services/modalConfirmService.js';
import { MODAL_ANIMATION_DURATION } from '@/config/constants.js';
import type { JSX } from 'react';

const parse = (parseHTML as any).default || parseHTML;

const appRoot = document.getElementById('app');
const modalPortalRoot = document.getElementById('modal-root') || document.body;

export default function ConfirmModal(): JSX.Element | null {
    const {
        isOpen,
        dismissible = true,
        prompt = '',
        confirmBtnLabel = 'Подтвердить',
        cancelBtnLabel = 'Отмена'
    } = useAppSelector(state => state.modalConfirm);

    const [isVisible, setIsVisible, isVisibleRef] = useSyncedStateWithRef(false); // Анимация
    const [isDisabled, setIsDisabled, isDisabledRef] = useSyncedStateWithRef(false);
    const [hasError, setHasError] = useState(false);

    const modalRef = useRef<HTMLDivElement | null>(null);
    const isFinalizeRef = useRef(false);
    const isClosingRef = useRef(false);
    const lastFocusedElemRef = useRef<Element | null>(null);
    const fallbackCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const dispatch = useAppDispatch();

    const { onConfirm, onFinalize, onCancel, onClose } = getConfirmModalActions();

    const handleConfirm = async () => {
        try {
            setIsDisabled(true);
            setHasError(false);
            await onConfirm?.();
            isFinalizeRef.current = true;
            isClosingRef.current = true;
            setIsVisible(false);
        } catch {
            setIsDisabled(false);
            setHasError(true);
        }
    };

    const clearFallbackCloseTimer = () => {
        clearTimeout(fallbackCloseTimer.current);
        fallbackCloseTimer.current = undefined;
    };

    const finalizeClose = () => {
        if (!isClosingRef.current) return;
        isClosingRef.current = false;

        clearFallbackCloseTimer();
        dispatch(closeConfirmModal());

        if (isFinalizeRef.current) {
            isFinalizeRef.current = false;
            onFinalize?.();
        } else {
            onClose?.();
        }

        appRoot?.removeAttribute('inert'); // До фокуса на сохранённом активном элементе
        if (lastFocusedElemRef.current instanceof HTMLElement) lastFocusedElemRef.current.focus();
        lastFocusedElemRef.current = null;
    };
    
    const handleCancel = async () => {
        if (isDisabledRef.current) return;
        if (isClosingRef.current) return;

        try {
            setIsDisabled(true);
            await onCancel?.();
            isClosingRef.current = true;
            setIsVisible(false);

            // Фоллбэк для отмены через Escape, если анимация закрытия не началась
            fallbackCloseTimer.current = setTimeout(finalizeClose, MODAL_ANIMATION_DURATION + 30);
        } catch {
            setIsDisabled(false);
            setHasError(true);
        }
    };

    // Включение/отключение анимации при открытии/закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            return setIsVisible(false);
        }

        clearFallbackCloseTimer();
        appRoot?.setAttribute('inert', '');
        setIsDisabled(false);
        setHasError(false);
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

    // Сохранение активного элемента и фокус на кнопке отмены модалки, если ввод был через клавиатуру
    useEffect(() => {
        if (!isOpen) return;

        const modal = modalRef.current;
        if (!modal) return;
        if (!wasLastInputKeyboard()) return;
    
        lastFocusedElemRef.current = document.activeElement;

        const cancelBtn = modal.querySelector('button.cancel-btn:not([disabled])');
        if (cancelBtn instanceof HTMLElement) cancelBtn.focus();
    }, [isOpen]);

    // Закрытие модального окна через Escape
    useEffect(() => {
        if (!isVisible) return;
    
        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') handleCancel();
        }
    
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isVisible]);

    if (!isOpen && !isVisible) return null;
  
    return createPortal(
        <div
            ref={modalRef}
            className={cn('modal-backdrop-portal', { 'visible' : isVisible })}
            onClick={dismissible && !isDisabled ? handleCancel : undefined}
        >
            <div
                className="confirm-modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="prompt">
                    {prompt.split(/\r?\n/).map((paragraph, idx) =>
                        paragraph
                            ? (
                                <p key={`modal-prompt-${idx}`}>
                                    {idx === 0 && <span className="icon">⚠️</span>}
                                    {parse(paragraph)}
                                </p>
                            )
                            : <br key={`modal-prompt-${idx}`} />
                    )}
                </div>

                <p className="error-message">
                    {hasError ? '❌ Ошибка при выполнении действия' : ''}
                </p>

                <div className="buttons-box">
                    <button className="confirm-btn" onClick={handleConfirm} disabled={isDisabled}>
                        <span className="icon">✅</span>
                        {confirmBtnLabel}
                    </button>

                    <button className="cancel-btn" onClick={handleCancel} disabled={isDisabled}>
                        <span className="icon">❌</span>
                        {cancelBtnLabel}
                    </button>
                </div>
            </div>
        </div>,
        
        modalPortalRoot
    );
}
