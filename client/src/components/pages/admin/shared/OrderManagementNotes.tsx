import { useState, useEffect } from 'react';
import { useStructureRefs } from '@/hooks/useStructureRefs.js';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface INewActiveOrdersAlertProps {
    customerComment?: string;
    internalNote?: string;
    cancellationReason?: string;
    floating?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const MIN_BOTTOM_OFFSET = 30;
const UI_LAYOUT_OFFSET = 10;

export default function OrderManagementNotes({
    customerComment,
    internalNote,
    cancellationReason,
    floating = false
}: INewActiveOrdersAlertProps): JSX.Element | null {
    const { mainFooterRef } = useStructureRefs();
    const [bottomOffset, setBottomOffset] = useState(MIN_BOTTOM_OFFSET);

    const hasContent = customerComment || internalNote || cancellationReason;

    useEffect(() => {
        if (!hasContent) return;
        if (!floating) return;

        const observer = new IntersectionObserver(
            // Коллбэк
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
        
                const visibleFooterHeight = entry.intersectionRect.height;
                const offset = Math.max(
                    MIN_BOTTOM_OFFSET,
                    Math.ceil(visibleFooterHeight + UI_LAYOUT_OFFSET)
                );
                
                setBottomOffset(offset);
            },

            // Условие вызова колбэка - достижение порога видимости элемента в процентах (100 делений)
            {
                threshold: Array.from({ length: 101 }, (_, i) => i / 100) // [0, 0.01, 0.02, ..., 1]
            }
        );

        if (mainFooterRef.current) observer.observe(mainFooterRef.current);

        return () => observer.disconnect();
    }, [floating]);

    if (!hasContent) return null;

    return (
        <div className="order-management-notes" style={{ bottom: `${bottomOffset}px` }}>
            {customerComment && (
                <div className="note">
                    <span className="note-badge customer-comment">💬</span>
                    <div className="note-popup">
                        Комментарий клиента:<br />
                        <span className="note-content">"{customerComment}"</span>
                    </div>
                </div>
            )}
            {internalNote && (
                <div className="note">
                    <span className="note-badge internal-note">📝</span>
                    <div className="note-popup">
                        Внутренняя заметка:<br />
                        <span className="note-content">"{internalNote}"</span>
                    </div>
                </div>
            )}
            {cancellationReason && (
                <div className="note">
                    <span className="note-badge cancellation-reason">🚫</span>
                    <div className="note-popup">
                        Причина отмены заказа:<br />
                        <span className="note-content">"{cancellationReason}"</span>
                    </div>
                </div>
            )}
        </div>
    );
}
