import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import PromoTimer from './promotions/PromoTimer.jsx';
import { sendPromoListRequest, sendPromoDeleteRequest } from '@/api/promoRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { DATA_LOAD_STATUS, NO_VALUE_LABEL } from '@/config/constants.js';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { formatLocalDate } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { USER_ROLE, DAY_IN_MS, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';
import type { IPromo } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IDeletingPromo {
    id: string;
    title: string;
}

interface IPromotionsMainProps {
    isPrivilegedUser: boolean;
    loadStatus: TDataLoadStatus;
    reloadPromos: () => void;
    promoList: IPromo[];
    editPromo: (promoId: string) => void;
    confirmPromoDeletion: (promo: IDeletingPromo) => void;
}

interface IPromoCardProps {
    promo: IPromo;
    isPrivilegedUser: boolean;
    editPromo: (promoId: string) => void;
    confirmPromoDeletion: (promo: IDeletingPromo) => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function Promotions(): JSX.Element {
    const { isAuthenticated, user } = useAppSelector(state => state.auth);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [promoList, setPromoList] = useState<IPromo[]>([]);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const userRole = user?.role ?? USER_ROLE.GUEST;
    const isPrivilegedUser = isAuthenticated && userRole === USER_ROLE.ADMIN;

    const promosLoadStatus =
        loading
            ? DATA_LOAD_STATUS.LOADING
            : loadError
                ? DATA_LOAD_STATUS.ERROR
                : !promoList.length
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const loadPromos = async (): Promise<void> => {
        setLoadError(false);
        setLoading(true);

        const requestArgs: [boolean, string?] = [isAuthenticated];

        if (!isPrivilegedUser) {
            const params = new URLSearchParams({
                timestamp: String(new Date().getTime()),
                timeZoneOffset: String(new Date().getTimezoneOffset())
            });
            const urlParams = params.toString();

            requestArgs.push(urlParams);

            if (location.search !== `?${urlParams}`) {
                const newUrl = `${location.pathname}?${urlParams}`;
                navigate(newUrl, { replace: true });
            }
        }

        const responseData = await dispatch(sendPromoListRequest(...requestArgs));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'PROMO: LOAD LIST', status, message });
        
        if (status !== REQUEST_STATUS.SUCCESS) {
            setLoadError(true);
        } else {
            setPromoList(responseData.promoList);
        }

        setLoading(false);
    }

    const reloadPromos = (): void => {
       loadPromos();
    };

    const editPromo = (promoId: string): void => {
        navigate(routeConfig.adminEvents.paths[0], { state: { promoId } });
    };

    const confirmPromoDeletion = (promo: IDeletingPromo): void => {
        if (!promo) return;

        const processPromoDeletion = async (promoId: string): Promise<void> => {
            const { status, message } = await dispatch(sendPromoDeleteRequest(promoId));
            if (isUnmountedRef.current) return;
    
            logRequestStatus({ context: 'PROMO: DELETE', status, message });
    
            const isAllowed = status === REQUEST_STATUS.SUCCESS || status === REQUEST_STATUS.NOT_FOUND;
            if (!isAllowed) throw new Error(message);
        };
    
        const finalizePromoDeletion = (promoId: string): void => {
            setPromoList(prev => prev.filter(promo => promo.id !== promoId));
        }

        dispatch(openConfirmModal({
            prompt: `Удалить акцию «${promo.title}»?`,
            onConfirm: () => processPromoDeletion(promo.id),
            onFinalize: () => finalizePromoDeletion(promo.id)
        }));
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Стартовая загрузка акций, при разлогинивании акции также перезагружаются
    useEffect(() => {
        loadPromos();
    }, [isPrivilegedUser]);

    return (
        <div className="promos-page">
            <header className="promos-header">
                <h2>Акции магазина</h2>
            </header>

            <PromotionsMain
                isPrivilegedUser={isPrivilegedUser}
                loadStatus={promosLoadStatus}
                reloadPromos={reloadPromos}
                promoList={promoList}
                editPromo={editPromo}
                confirmPromoDeletion={confirmPromoDeletion}
            />
        </div>
    );
}

function PromotionsMain({
    isPrivilegedUser,
    loadStatus,
    reloadPromos,
    promoList,
    editPromo,
    confirmPromoDeletion
}: IPromotionsMainProps): JSX.Element {
    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div className="promos-main">
                <div className="promos-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка акций...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div className="promos-main">
                <div className="promos-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Акции не доступны.
                    </p>
                    <button className="reload-btn" onClick={reloadPromos}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div className="promos-main">
                <div className="promos-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        На данный момент акции отсутствуют.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="promos-main">
            <ul className="promo-list">
                {promoList.map(promo => (
                    <li key={promo.id} className="promo-item">
                        <PromoCard
                            promo={promo}
                            isPrivilegedUser={isPrivilegedUser}
                            editPromo={editPromo}
                            confirmPromoDeletion={confirmPromoDeletion}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PromoCard({
    promo,
    isPrivilegedUser,
    editPromo,
    confirmPromoDeletion
}: IPromoCardProps): JSX.Element {
    const {
        id, title, image, description, startDate, endDate, createdBy, createdAt, updateHistory
    } = promo;

    const startDateNoTZ = startDate.slice(0, -1);
    const endDateNoTZ = endDate.slice(0, -1);
    const now = new Date();
    const start = new Date(startDateNoTZ);
    const end = new Date(endDateNoTZ);

    const promoActivity = now < start ? 'not-started' : now > end ? 'ended' : 'active';
    const isOneDayAction = end.getTime() - start.getTime() <= DAY_IN_MS;

    const promoDatesFormatOpts: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };

    return (
        <article data-id={id} className={cn('promo-card', promoActivity)}>
            <h2 className="promo-title">{title}</h2>

            {image && (
                <TrackedImage src={image} className="promo-image" alt={title} />
            )}

            <div className="promo-description">
                {description.split(/\r?\n/).map((paragraph, idx) =>
                    paragraph
                        ? <p key={`${id}-${idx}`}>{paragraph}</p>
                        : <br key={`${id}-${idx}`} />
                )}
            </div>

            <p className="promo-dates">
                Акция действует:
                <span className="dates-display">
                    {isOneDayAction
                        ? formatLocalDate(startDateNoTZ, promoDatesFormatOpts)
                        : `с ${formatLocalDate(startDateNoTZ, promoDatesFormatOpts)}
                           по ${formatLocalDate(endDateNoTZ, promoDatesFormatOpts)}`
                    }
                </span>
            </p>

            <PromoTimer startDate={startDateNoTZ} endDate={endDateNoTZ} />

            {isPrivilegedUser && (
                <>
                    <div className="promo-meta">
                        <p>Автор: {createdBy ?? NO_VALUE_LABEL} ({formatLocalDate(createdAt)})</p>
                        {(updateHistory ?? []).length > 0 && (
                            <p>
                                Редактор(ы): {' '}
                                {(updateHistory ?? [])
                                    .map(upd => `${upd.updatedBy} (${formatLocalDate(upd.updatedAt)})`)
                                    .join(', ')}
                            </p>
                        )}
                    </div>

                    <div className="promo-controls">
                        <button
                            className="edit-promo-btn"
                            onClick={() => editPromo(id)}
                        >
                            <span className="icon">🖊</span>
                            Редактировать
                        </button>

                        <button
                            className="delete-promo-btn"
                            onClick={() => confirmPromoDeletion({ id, title })}
                        >
                            <span className="icon">❌</span>
                            Удалить
                        </button>
                    </div>
                </>
            )}
        </article>
    );
}
