import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  return {
    platform,
    isNative: Capacitor.isNativePlatform(),
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
  };
}
