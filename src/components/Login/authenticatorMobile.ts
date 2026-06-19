export type MobilePlatform = 'android' | 'ios' | 'other';

export interface AuthenticatorAppConfig {
  name: string;
  androidPackage: string;
  playStoreUrl: string;
  appStoreUrl: string;
}

export const MICROSOFT_AUTHENTICATOR: AuthenticatorAppConfig = {
  name: 'Microsoft Authenticator',
  androidPackage: 'com.azure.authenticator',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
  appStoreUrl: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
};

export function detectMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'other';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod/i.test(ua);
}

export function getStoreUrl(platform: MobilePlatform): string {
  return platform === 'ios'
    ? MICROSOFT_AUTHENTICATOR.appStoreUrl
    : MICROSOFT_AUTHENTICATOR.playStoreUrl;
}

export function getStoreLabel(platform: MobilePlatform): string {
  return platform === 'ios' ? 'App Store' : 'Play Store';
}

/**
 * Abre Microsoft Authenticator con la cuenta TOTP.
 * Android: intent con fallback a Play Store si la app no está instalada.
 * iOS: enlace otpauth (si aparece selector, elegir Microsoft Authenticator).
 */
export function openMicrosoftAuthenticator(
  otpauthUrl: string,
  platform: MobilePlatform = detectMobilePlatform(),
): void {
  if (!otpauthUrl) return;

  if (platform === 'android') {
    const path = otpauthUrl.replace(/^otpauth:\/\//i, '');
    const fallback = encodeURIComponent(MICROSOFT_AUTHENTICATOR.playStoreUrl);
    const intentUrl =
      `intent://${path}#Intent;scheme=otpauth;package=${MICROSOFT_AUTHENTICATOR.androidPackage};` +
      `S.browser_fallback_url=${fallback};end`;
    window.location.href = intentUrl;
    return;
  }

  window.location.href = otpauthUrl;
}
