import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useT } from '../i18n';
import { Txt } from '../ui/Txt';
import type { Captcha } from './captcha';

export type { Captcha } from './captcha';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';
let loading: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => {
      loading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Web: Cloudflare Turnstile, which most people pass without doing anything. */
export function useCaptcha(): Captcha {
  const { t, lang } = useT();
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let live = true;
    const el = box.current as unknown as HTMLElement;
    loadTurnstile()
      .then((ts) => {
        if (!live) return;
        widget.current = ts.render(el, {
          sitekey: SITE_KEY,
          theme: 'dark',
          language: lang,
          callback: (tok: string) => setToken(tok),
          'expired-callback': () => setToken(undefined),
          'error-callback': () => setToken(undefined),
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [lang]);

  if (!SITE_KEY) return { element: null, token: undefined, waiting: false, reset: () => undefined };
  return {
    element: (
      <View style={{ alignItems: 'center', minHeight: 65, gap: 4 }}>
        <View ref={box} testID="captcha" />
        {!token && <Txt variant="caption">{t('captcha.wait')}</Txt>}
      </View>
    ),
    token,
    waiting: !token,
    reset: () => {
      setToken(undefined);
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  };
}
