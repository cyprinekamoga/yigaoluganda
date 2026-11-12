import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { quote, type Quote } from '../pricing/pricing';

/** Best guess before the server answers: the device's region. */
function localGuess(): Quote {
  try {
    return quote(getLocales()[0]?.regionCode);
  } catch {
    return quote('');
  }
}

/**
 * The monthly price for this learner. On the web it asks the app's /api/price edge function,
 * which knows the country from the IP address, the same signal Stripe Checkout uses.
 */
export function usePrice(): Quote {
  const [q, setQ] = useState<Quote>(localGuess);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let live = true;
    fetch('/api/price')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Quote | null) => {
        if (live && data && typeof data.total === 'number' && data.currency) setQ(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return q;
}
