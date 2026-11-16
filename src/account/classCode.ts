import { cleanEightCode, linkCode } from './linkCode';

/**
 * A class code from a teacher's link (…/sign-up?class=ABCD2345), remembered on this device until the
 * student has joined the class: then there is nothing to pay.
 */
export const CLASS_CODE = /^[A-Z0-9]{8}$/;
const classCode = linkCode('yiga-class', 'class', cleanEightCode);

export const cleanClassCode = cleanEightCode;
export const rememberClassCode = classCode.remember;
export const pendingClassCode = classCode.pending;
export const forgetClassCode = classCode.forget;
export const useClassCode = classCode.useCode;
