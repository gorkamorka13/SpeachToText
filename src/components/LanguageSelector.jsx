import React, { useState, useEffect, useRef } from 'react';

const LanguageSelector = ({ label, value, onChange, languages, disabled, className, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLang = languages.find(l => l.code === value) || languages[0];

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm sm:text-base h-[46px] sm:h-[50px] transition-all shadow-sm ${isOpen ? 'ring-2 ring-purple-500 border-transparent' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={`https://flagcdn.com/w40/${selectedLang.countryCode}.png`}
            alt={selectedLang.name}
            className="w-5 h-auto rounded-sm flex-shrink-0 shadow-sm"
          />
          <span className="truncate">{selectedLang.name.split(' ').slice(1).join(' ') || selectedLang.name}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${value === lang.code
                  ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
              >
                <img
                  src={`https://flagcdn.com/w40/${lang.countryCode}.png`}
                  alt={lang.name}
                  className="w-5 h-auto rounded-sm flex-shrink-0 shadow-sm"
                />
                <span className="flex-1 text-left">{lang.name.split(' ').slice(1).join(' ') || lang.name}</span>
                {value === lang.code && (
                  <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
