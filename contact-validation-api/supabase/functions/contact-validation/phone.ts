// Phone validation via libphonenumber (Google's metadata, npm build).

import {
  type CountryCode,
  parsePhoneNumberFromString,
} from "npm:libphonenumber-js@1.11.5/max";

export interface PhoneValidation {
  phone: string;
  valid: boolean;
  possible: boolean;
  reason: string | null;
  e164: string | null;
  international: string | null;
  national: string | null;
  country: string | null;
  calling_code: string | null;
  type: string | null; // MOBILE, FIXED_LINE, FIXED_LINE_OR_MOBILE, VOIP, TOLL_FREE, ...
}

const ISO2_RE = /^[A-Za-z]{2}$/;

export function validatePhone(phone: string, country?: string): PhoneValidation {
  const base: PhoneValidation = {
    phone: typeof phone === "string" ? phone.trim() : String(phone),
    valid: false,
    possible: false,
    reason: null,
    e164: null,
    international: null,
    national: null,
    country: null,
    calling_code: null,
    type: null,
  };
  if (!base.phone) {
    return { ...base, reason: "empty" };
  }
  let cc: CountryCode | undefined;
  if (country) {
    if (!ISO2_RE.test(country)) return { ...base, reason: "invalid_country_code" };
    cc = country.toUpperCase() as CountryCode;
  }
  let parsed;
  try {
    parsed = parsePhoneNumberFromString(base.phone, cc);
  } catch {
    return { ...base, reason: "parse_error" };
  }
  if (!parsed) {
    return {
      ...base,
      reason: cc || base.phone.startsWith("+")
        ? "not_a_phone_number"
        : "missing_country_hint_or_plus_prefix",
    };
  }
  const valid = parsed.isValid();
  return {
    ...base,
    valid,
    possible: parsed.isPossible(),
    reason: valid ? null : "invalid_for_region",
    e164: parsed.number ?? null,
    international: parsed.formatInternational(),
    national: parsed.formatNational(),
    country: parsed.country ?? null,
    calling_code: parsed.countryCallingCode ? `+${parsed.countryCallingCode}` : null,
    type: parsed.getType() ?? null,
  };
}
