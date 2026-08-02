import React, { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext({ language: 'English', setLanguage: () => {} });

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => localStorage.getItem('vendorLanguage') || 'English');

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('vendorLanguage', lang);
        } catch {
            // Storage unavailable (private mode) — keep in-memory value.
        }
    }, []);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
