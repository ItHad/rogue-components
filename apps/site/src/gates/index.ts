import { ageGate } from "./AgeGate";
import { captchaGate } from "./CaptchaGate";
import { consentGate } from "./ConsentGate";
import { paymentGate } from "./PaymentGate";
import { termsGate } from "./TermsGate";
import type { Gate } from "./types";

/** 関門は上から順に出てくる (その操作に関係するものだけ)。 */
export const GATES: readonly Gate[] = [consentGate, termsGate, ageGate, captchaGate, paymentGate];

export type { Action, Gate, GateProps, GateRequest } from "./types";
