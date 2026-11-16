import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * A value that arrives in a link (…/sign-up?class=ABCD2345, ?family=…, ?plan=yearly) and is
 * remembered on this device until it has been used, also across the e-mail confirmation.
 */
export interface LinkCode {
  clean: (raw: string | null | undefined) => string | null;
  remember: (raw: string | null | undefined) => void;
  pending: () => Promise<string | null>;
  forget: () => void;
  useCode: () => string | null;
}

export function linkCode(storageKey: string, param: string, clean: (raw: string | null | undefined) => string | null): LinkCode {
  let current: string | null = null;
  const listeners = new Set<(code: string | null) => void>();
  const set = (code: string | null) => {
    current = code;
    listeners.forEach((l) => l(code));
  };
  const remember = (raw: string | null | undefined) => {
    const code = clean(raw);
    if (!code) return;
    set(code);
    AsyncStorage.setItem(storageKey, code).catch(() => undefined);
  };
  const pending = async () => {
    if (current) return current;
    try {
      const saved = clean(await AsyncStorage.getItem(storageKey));
      if (saved) set(saved);
    } catch {
      // no storage
    }
    return current;
  };
  const forget = () => {
    set(null);
    AsyncStorage.removeItem(storageKey).catch(() => undefined);
  };
  function useCode(): string | null {
    const [code, setCode] = useState<string | null>(current);
    useEffect(() => {
      listeners.add(setCode);
      pending().then(setCode);
      return () => {
        listeners.delete(setCode);
      };
    }, []);
    return code;
  }
  // On the web, a page opened from such a link remembers the value.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    remember(new URLSearchParams(window.location.search).get(param));
  }
  return { clean, remember, pending, forget, useCode };
}

/** "abcd 2345", "ABCD-2345" → "ABCD2345", or null when it can't be a code (8 letters and digits). */
export function cleanEightCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}
