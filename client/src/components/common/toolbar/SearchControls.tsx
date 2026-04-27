import { useState } from 'react';
import { logToolbarMissingProps } from '@/helpers/toolbarHelpers.js';
import type { JSX, Dispatch, SetStateAction } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface TSearchControlsProps {
    search?: string;
    setSearch?: Dispatch<SetStateAction<string>>;
    placeholder?: string;
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function SearchControls({
    search,
    setSearch,
    placeholder = '',
    uiBlocked = false
}: TSearchControlsProps): JSX.Element | null {
    if (search == null || setSearch == null) {
        logToolbarMissingProps('SearchControls', { search, setSearch });
        return null; 
    }

    const [currentSearch, setCurrentSearch] = useState(search);

    const handleSearch = (): void => {
        const normalizedSearch = currentSearch.trim();

        if (normalizedSearch !== search) {
            setSearch(normalizedSearch);
        }
    };

    return (
        <div className="search-controls">
            <label htmlFor="search">Поиск: </label>
            
            <input
                id="search"
                type="search"
                placeholder={placeholder}
                title={placeholder}
                value={currentSearch}
                autoComplete="off"
                onChange={(e) => setCurrentSearch(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                disabled={uiBlocked}
            />

            <button
                className="search-btn"
                onClick={handleSearch}
                disabled={uiBlocked || currentSearch.trim() === search}
            >
                Найти
            </button>
        </div>
    );
}
