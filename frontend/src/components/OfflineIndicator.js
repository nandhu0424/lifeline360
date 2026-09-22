import React, { useState, useEffect } from 'react';

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            background: '#ef4444', // Red for alert
            color: 'white',
            padding: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
        }}>
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>wifi_off</span>
            You are currently offline. Changes are saved locally and will sync once reconnected.
        </div>
    );
};

export default OfflineIndicator;
