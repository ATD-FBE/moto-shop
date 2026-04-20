import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import { sendNewsListRequest, sendNewsDeleteRequest } from '@/api/newsRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { DATA_LOAD_STATUS, NO_VALUE_LABEL } from '@/config/constants.js';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { formatLocalDate } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { USER_ROLE, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';
import type { INews } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IDeletingNews {
    id: string;
    title: string;
}

interface INewsMainProps {
    isPrivilegedUser: boolean;
    loadStatus: TDataLoadStatus;
    reloadNews: () => void;
    newsList: INews[];
    editNews: (newsId: string) => void;
    confirmNewsDeletion: (news: IDeletingNews) => void;
}

interface INewsCardProps {
    news: INews;
    isPrivilegedUser: boolean;
    editNews: (newsId: string) => void;
    confirmNewsDeletion: (news: IDeletingNews) => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function News(): JSX.Element {
    const { isAuthenticated, user } = useAppSelector(state => state.auth);

    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [newsList, setNewsList] = useState<INews[]>([]);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const userRole = user?.role ?? USER_ROLE.GUEST;
    const isPrivilegedUser = isAuthenticated && userRole === USER_ROLE.ADMIN;
    
    const newsLoadStatus =
        loading
            ? DATA_LOAD_STATUS.LOADING
            : loadError
                ? DATA_LOAD_STATUS.ERROR
                : !newsList.length
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const loadNews = async (): Promise<void> => {
        setLoadError(false);
        setLoading(true);

        const responseData = await dispatch(sendNewsListRequest(isAuthenticated));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'NEWS: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setLoadError(true);
        } else {
            setNewsList(responseData.newsList);
        }
        
        setLoading(false);
    };

    const reloadNews = (): void => {
        loadNews();
    };

    const editNews = (newsId: string): void => {
        navigate(routeConfig.adminEvents.paths[0], { state: { newsId } });
    };

    const confirmNewsDeletion = (news: IDeletingNews): void => {
        if (!news) return;

        const processNewsDeletion = async (newsId: string): Promise<void> => {
            const { status, message } = await dispatch(sendNewsDeleteRequest(newsId));
            if (isUnmountedRef.current) return;
    
            logRequestStatus({ context: 'NEWS: DELETE', status, message });
    
            const isAllowed = status === REQUEST_STATUS.SUCCESS || status === REQUEST_STATUS.NOT_FOUND;
            if (!isAllowed) throw new Error(message);
        };
    
        const finalizaNewsDeletion = (newsId: string): void => {
            setNewsList(prev => prev.filter(news => news.id !== newsId));
        };

        openConfirmModal({
            prompt: `Удалить новость «${news.title}»?`,
            onConfirm: () => processNewsDeletion(news.id),
            onFinalize: () => finalizaNewsDeletion(news.id)
        });
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Стартовая загрузка новостей
    useEffect(() => {
        loadNews();
    }, []);

    return (
        <div className="news-page">
            <header className="news-header">
                <h2>Новости магазина</h2>
            </header>

            <NewsMain
                isPrivilegedUser={isPrivilegedUser}
                loadStatus={newsLoadStatus}
                reloadNews={reloadNews}
                newsList={newsList}
                editNews={editNews}
                confirmNewsDeletion={confirmNewsDeletion}
            />
        </div>
    );
}

function NewsMain({
    isPrivilegedUser,
    loadStatus,
    reloadNews,
    newsList,
    editNews,
    confirmNewsDeletion
}: INewsMainProps): JSX.Element {
    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div className="news-main">
                <div className="news-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка новостей...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div className="news-main">
                <div className="news-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Новости не доступны.
                    </p>
                    <button className="reload-btn" onClick={reloadNews}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div className="news-main">
                <div className="news-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        На данный момент новостей нет.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="news-main">
            <ul className="news-list">
                {newsList.map(news => (
                    <li key={news.id} className="news-item">
                        <NewsCard
                            news={news}
                            isPrivilegedUser={isPrivilegedUser}
                            editNews={editNews}
                            confirmNewsDeletion={confirmNewsDeletion}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function NewsCard({
    news,
    isPrivilegedUser,
    editNews,
    confirmNewsDeletion
}: INewsCardProps): JSX.Element {
    const { id, publishDate, title, content, createdBy, updateHistory } = news;

    return (
        <article data-id={id} className="news-card">
            <div className="news-date">
                Опубликовано: {formatLocalDate(publishDate, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })}
            </div>

            <h3 className="news-title">{title}</h3>

            <div className="news-content">
                {content.split(/\r?\n/).map((paragraph, idx) =>
                    paragraph
                        ? <p key={`${id}-${idx}`}>{paragraph}</p>
                        : <br key={`${id}-${idx}`} />
                )}
            </div>

            {isPrivilegedUser && (
                <>
                    <div className="news-meta">
                        <p>Автор: {createdBy ?? NO_VALUE_LABEL} ({formatLocalDate(publishDate)})</p>
                        {(updateHistory ?? []).length > 0 && (
                            <p>
                                Редактор(ы):{' '}
                                {(updateHistory ?? [])
                                    .map(upd => `${upd.updatedBy} (${formatLocalDate(upd.updatedAt)})`)
                                    .join(', ')}
                            </p>
                        )}
                    </div>

                    <div className="news-controls">
                        <button
                            className="edit-news-btn"
                            onClick={() => editNews(id)}
                        >
                            <span className="icon">🖊</span>
                            Редактировать
                        </button>

                        <button
                            className="delete-news-btn"
                            onClick={() => confirmNewsDeletion({ id, title })}
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
