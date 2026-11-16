import { isPlan, type Plan } from '../pricing/pricing';
import { cleanEightCode, linkCode } from './linkCode';

/**
 * A Family plan invite (…/sign-up?family=ABCD2345 from the person who pays), remembered on this
 * device until the invited person has joined: then there is nothing to pay.
 */
const familyCode = linkCode('yiga-family', 'family', cleanEightCode);
export const rememberFamilyCode = familyCode.remember;
export const forgetFamilyCode = familyCode.forget;
export const useFamilyCode = familyCode.useCode;

/** The plan chosen on the website (…/sign-up?plan=yearly): after sign-up, the payment page opens for it. */
const chosenPlan = linkCode('yiga-plan', 'plan', (raw) => (isPlan(raw) ? raw : null));
export const pendingPlan = chosenPlan.pending as () => Promise<Plan | null>;
export const forgetPlan = chosenPlan.forget;
export const usePlanFromLink = chosenPlan.useCode as () => Plan | null;
