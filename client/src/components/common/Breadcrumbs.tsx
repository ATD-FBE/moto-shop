import { useMemo }  from 'react';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import { useAppSelector } from '@/hooks/storeHooks.js';
import { breadcrumbMap } from '@/config/appRouting.js';
import { SCREEN_SIZE, NO_VALUE_LABEL } from '@/config/constants.js';
import type { JSX } from 'react';
import type { IBreadcrumb } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IBreadcrumbsProps {
    path: string;
}

interface IBreadcrumbTrailEntry {
    label: string;
    path: string;
}

type TExtractParamSchemaValue<T> = T extends undefined ? never : T[keyof T];
type TExpectedParamSchema = TExtractParamSchemaValue<IBreadcrumb['paramSchema']>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

// Функция для извлечения параметров из адресной строки
const extractParams = (
    pattern: string,
    path: string,
    paramSchema: IBreadcrumb['paramSchema']
): Record<string, string> => {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    const params: Record<string, string> = {};

    patternParts.forEach((part, idx) => {
        if (!part.startsWith(':')) return;

        const key = part.slice(1);
        const rawValue = pathParts[idx];
        if (!rawValue) return;

        const schema = paramSchema && key in paramSchema
            ? (paramSchema as Record<string, TExpectedParamSchema>)[key]
            : undefined;

        if (!schema) {
            params[key] = rawValue;
            return;
        }

        const chunks = rawValue.split(schema.split);

        schema.map.forEach((name, idx) => {
            if (!chunks[idx]) return;
            params[name] = chunks[idx];
        });
    });

    return params;
};

// Построение цепочки "хлебных крошек" для динамических и обычных маршрутов
const buildBreadcrumbTrail = (fullPattern: string, normalizedPath: string): IBreadcrumbTrailEntry[] => {
    const trail: IBreadcrumbTrailEntry[] = [];
    let currentPattern: string | undefined = fullPattern;

    while (currentPattern && currentPattern in breadcrumbMap) {
        const node: IBreadcrumb = breadcrumbMap[currentPattern as keyof typeof breadcrumbMap];
        const params = extractParams(currentPattern, normalizedPath, node.paramSchema);
        
        const nodeLabel = typeof node.label === 'function'
            ? node.label(params as any)
            : node.label;
            
        const nodePath = node.generatePath
            ? node.generatePath(params as any)
            : currentPattern;

        trail.unshift({ label: nodeLabel, path: nodePath });
        currentPattern = node.parentPath;
    }

    return trail;
};

export default function Breadcrumbs({ path }: IBreadcrumbsProps): JSX.Element | null {
    const { screenSize } = useAppSelector(state => state.ui);

    const trail = useMemo(() => {
        const normalizedPath = path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;

        // Поиск шаблона в карте хлебных крошек, подходящий под текущий path
        const matchedPattern = Object.keys(breadcrumbMap)
            .sort((a, b) => (a === '*' ? 1 : b === '*' ? -1 : 0))
            .find(pattern => {
                if (pattern === '*') return true;
                
                const regexPattern = pattern
                    .replace(/[\/.*+?^${}|\[\]()\\]/g, '\\$&')
                    .replace(/:[^\/]+/g, '[^/]+');
                return new RegExp('^' + regexPattern + '$').test(normalizedPath);
            });
    
        // Построение хлебных крошек
        return matchedPattern ? buildBreadcrumbTrail(matchedPattern, normalizedPath) : [];
    }, [path]);

    if (trail.length <= 1) return null;

    const prevCrumb = trail.at(-2);

    return (
        <nav className="breadcrumbs-nav">
            {screenSize === SCREEN_SIZE.XS ? (
                <BlockableLink to={prevCrumb?.path ?? '/'} className="prev-link-crumb">
                    <span className="icon">❮</span>
                    <span className="label">{prevCrumb?.label ?? NO_VALUE_LABEL}</span>
                </BlockableLink>
            ) : (
                <ul>
                    {trail.map((crumb, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === trail.length - 1;
    
                        return (
                            <li key={`${crumb.path}-${idx}`}>
                                {!isFirst && <span className="breadcrumb-separator">›</span>}
    
                                {isLast ? (
                                    <span className="last-crumb">{crumb.label}</span>
                                ) : (
                                    <BlockableLink to={crumb.path} className="link-crumb">
                                        {crumb.label}
                                    </BlockableLink>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </nav>
    );
}
