import { useState, useCallback, useRef, useEffect } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);
  const timeoutRef = useRef(null);

  const showNotification = useCallback((message) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification(message);
    timeoutRef.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { notification, showNotification };
};
