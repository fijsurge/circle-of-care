import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export function useCapacitorPlugins(isDark) {
  const navigate = useNavigate();
  const handlesRef = useRef([]);

  // Sync status bar style to theme
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: isDark ? '#1f2937' : '#ffffff' });
    }
  }, [isDark]);

  // Register app listeners (back button + app state)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const addListeners = async () => {
      if (Capacitor.getPlatform() === 'android') {
        const h = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            navigate(-1);
          } else {
            App.exitApp();
          }
        });
        handlesRef.current.push(h);
      }

      const h = await App.addListener('appStateChange', (_state) => {
        // Scaffold for future use
      });
      handlesRef.current.push(h);
    };

    addListeners();

    return () => {
      handlesRef.current.forEach(h => h?.remove());
      handlesRef.current = [];
    };
  }, [navigate]);
}
