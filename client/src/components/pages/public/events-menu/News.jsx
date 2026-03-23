import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { sendNewsListRequest, sendNewsDeleteRequest } from '@/api/newsRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';

export default function News() {
    const { isAuthenticated, user } = useSelector(state => state.auth);

    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [newsList, setNewsList] = useState([]);

    const isUnmountedRef = useRef(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const userRole = user?.role ?? 'guest';
    const isPrivilegedUser = isAuthenticated && ['admin'].includes(userRole);
    
    const newsLoadStatus =
        loading
            ? DATA_LOAD_STATUS.LOADING
            : loadError
                ? DATA_LOAD_STATUS.ERROR
                : !newsList.length
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const loadNews = async () => {
        setLoadError(false);
        setLoading(true);

        const { status, message, newsList } = await dispatch(sendNewsListRequest(isAuthenticated));
        if (isUnmountedRef.current) return;

        logRequestStatus({ context: 'NEWS: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setLoadError(true);
        } else {
            setNewsList(newsList);
        }
        
        setLoading(false);
    };

    const reloadNews = async () => {
        await loadNews();
    };

    const editNews = (newsId) => {
        navigate(routeConfig.adminEvents.paths[0], { state: { newsId } });
    };

    const confirmNewsDeletion = (news) => {
        if (!news) return;

        const processNewsDeletion = async (newsId) => {
            const { status, message } = await dispatch(sendNewsDeleteRequest(newsId));
            if (isUnmountedRef.current) return;
    
            logRequestStatus({ context: 'NEWS: DELETE', status, message });
    
            const isAllowed = [REQUEST_STATUS.SUCCESS, REQUEST_STATUS.NOT_FOUND].includes(status);
            if (!isAllowed) throw new Error(message);
        };
    
        const finalizaNewsDeletion = (newsId) => {
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
}) {
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

function NewsCard({news, isPrivilegedUser, editNews, confirmNewsDeletion }) {
    const { id, publishDate, title, content, createdBy, updateHistory } = news;

    const formatLocalDate = (date, format = {}) => new Date(date)?.toLocaleString(undefined, format);

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

            <br />

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
                        <br />
                        <p>Автор: {createdBy} ({formatLocalDate(publishDate)})</p>
                        {updateHistory.length > 0 && (
                            <p>
                                Редактор(ы):{' '}
                                {updateHistory
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
