import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DB_NAME = 'Lifeline360_PHC_DB';
const STORE_NAME = 'pending_attendance';

const useSyncEngine = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [db, setDb] = useState(null);

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'local_id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => setDb(e.target.result);
    request.onerror = (e) => console.error('IndexedDB Error:', e.target.error);

    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Save record to Local Storage
  const recordOfflineAttendance = useCallback(async (record) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({
        ...record,
        sync_status: 'pending',
        local_timestamp: new Date().toISOString()
      });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Sync Pending Records to Cloud
  const syncPendingRecords = useCallback(async () => {
    if (!db || !navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const records = request.result;
        if (records.length === 0) {
          setIsSyncing(false);
          return;
        }

        try {
          const response = await axios.post('/api/attendance/sync', { records });
          
          if (response.data.success) {
            const { synced } = response.data.data;
            
            // Delete synced records from local
            const delTx = db.transaction([STORE_NAME], 'readwrite');
            const delStore = delTx.objectStore(STORE_NAME);
            
            synced.forEach(id => delStore.delete(id));
            console.log(`Synced ${synced.length} records to cloud.`);
          }
        } catch (err) {
          console.error('Sync failed:', err);
        } finally {
          setIsSyncing(false);
        }
      };
    } catch (error) {
      console.error('Sync Error:', error);
      setIsSyncing(false);
    }
  }, [db, isSyncing]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncPendingRecords();
    }
  }, [isOnline, syncPendingRecords]);

  return {
    isOnline,
    isSyncing,
    recordOfflineAttendance,
    syncPendingRecords
  };
};

export default useSyncEngine;
