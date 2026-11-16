import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Refer a friend, the friend's side: an invite link (…?ref=SARA-7K3D) is remembered on this device
 * until the friend pays, and the code goes with them to the payment page (first month free).
 */
const KEY = 'yiga-invite';
const VALID = /^[A-Z0-9-]{4,24}$/;
let current: string | null = null;
const listeners = new Set<(code: string | null) => void>();

function set(code: string | null) {
  current = code;
  listeners.forEach((l) => l(code));
}

/** Keeps a code from a link. */
export function rememberInvite(raw: string | null | undefined) {
  const code = (raw ?? '').trim().toUpperCase();
  if (!VALID.test(code)) return;
  set(code);
  AsyncStorage.setItem(KEY, code).catch(() => undefined);
}

export async function inviteCode(): Promise<string | null> {
  if (current) return current;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && VALID.test(saved)) set(saved);
  } catch {
    // no storage: no invite
  }
  return current;
}

export function forgetInvite() {
  set(null);
  AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** The invite code on this device, for showing "your first month is free". */
export function useInvite(): string | null {
  const [code, setCode] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setCode);
    inviteCode().then(setCode);
    return () => {
      listeners.delete(setCode);
    };
  }, []);
  return code;
}

// On the web, any page opened from an invite link (…?ref=CODE) remembers it.
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
  rememberInvite(new URLSearchParams(window.location.search).get('ref'));
}
