import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type NormalizedPhone = {
  e164: string;
  country: string;
};

export function normalizePhone(input: string, defaultCountry: CountryCode = "GT"): NormalizedPhone {
  const clean = input.trim();
  const parsed = parsePhoneNumberFromString(clean, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new Error("El número de teléfono no es válido. Usa un celular de Guatemala, por ejemplo +502 5555 5555.");
  }

  return {
    e164: parsed.number,
    country: parsed.country ?? defaultCountry,
  };
}

export function isValidInternationalPhone(input: string, defaultCountry: CountryCode = "GT") {
  try {
    normalizePhone(input, defaultCountry);
    return true;
  } catch {
    return false;
  }
}
