import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * A class code from a teacher's link (…/sign-up?class=ABCD2345), remembered on this device until the
 * student has joined the class: then there is nothing to pay.
 */
const KEY = 'yiga-class';
export const CLASS_CODE = /^[A-Z0-9]{8}$/;
let current: string | null = null;
const listeners = new Set<(code: string | null) => void>();

function set(code: string | null) {
  current = code;
  listeners.forEach((l) => l(code));
}

/** "abcd 2345", "ABCD-2345" → "ABCD2345", or null when it can't be a class code. */
export function cleanClassCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return CLASS_CODE.test(code) ? code : null;
}

export function rememberClassCode(raw: string | null | undefined) {
  const code = cleanClassCode(raw);
  if (!code) return;
  set(code);
  AsyncStorage.setItem(KEY, code).catch(() => undefined);
}

export async function pendingClassCode(): Promise<string | null> {
  if (current) return current;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && CLASS_CODE.test(saved)) set(saved);
  } catch {
    // no storage
  }
  return current;
}

export function forgetClassCode() {
  set(null);
  AsyncStorage.removeItem(KEY).catch(() => undefined);
}

export function useClassCode(): string | null {
  const [code, setCode] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setCode);
    pendingClassCode().then(setCode);
    return () => {
      listeners.delete(setCode);
    };
  }, []);
  return code;
}

// On the web, a page opened from a teacher's link (…?class=CODE) remembers the code.
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
  rememberClassCode(new URLSearchParams(window.location.search).get('class'));
}
