import { useEffect, useRef } from 'react';
import type { AdminUser, CollaboratorTimeLog } from '../types/admin';

const STORAGE_KEY = 'bonomo_collab_time_logs_v1';

export const getCollaboratorTimeLogs = (): Record<string, CollaboratorTimeLog> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveCollaboratorTimeLogs = (logs: Record<string, CollaboratorTimeLog>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {}
};

export const useActiveTimeTracker = (currentUser: AdminUser | null) => {
  const isTabActiveRef = useRef<boolean>(true);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser?.id) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const logKey = `${currentUser.id}_${todayStr}`;

    const updateActiveTime = () => {
      const now = Date.now();
      const deltaSeconds = Math.round((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      if (isTabActiveRef.current && deltaSeconds > 0 && deltaSeconds < 60) {
        const logs = getCollaboratorTimeLogs();
        const currentLog = logs[logKey] || {
          collaboratorId: currentUser.id,
          collaboratorName: currentUser.name || 'Colaborador',
          date: todayStr,
          activeSeconds: 0,
          lastActiveTimestamp: now,
        };

        currentLog.activeSeconds += deltaSeconds;
        currentLog.lastActiveTimestamp = now;
        currentLog.collaboratorName = currentUser.name;
        logs[logKey] = currentLog;

        saveCollaboratorTimeLogs(logs);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isTabActiveRef.current = true;
        lastTickRef.current = Date.now();
      } else {
        updateActiveTime();
        isTabActiveRef.current = false;
      }
    };

    const handleFocus = () => {
      isTabActiveRef.current = true;
      lastTickRef.current = Date.now();
    };

    const handleBlur = () => {
      updateActiveTime();
      isTabActiveRef.current = false;
    };

    // Heartbeat ticker every 5 seconds
    const interval = setInterval(() => {
      if (isTabActiveRef.current) {
        updateActiveTime();
      }
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', updateActiveTime);

    return () => {
      updateActiveTime();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', updateActiveTime);
    };
  }, [currentUser?.id, currentUser?.name]);
};
