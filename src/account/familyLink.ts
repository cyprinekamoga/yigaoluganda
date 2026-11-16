import { APP_URL } from './config';

/** The link the payer shares: sign up (or log in), and the invite code joins the Family plan. */
export const familyLink = (code: string, lang: 'en' | 'sv') => `${APP_URL}/sign-up?family=${code}&lang=${lang}`;
