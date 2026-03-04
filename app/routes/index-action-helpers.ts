export function getRedirectTo(formData: FormData, fallback = "/") {
  return String(formData.get("redirectTo") ?? fallback);
}

export function getRequiredName(formData: FormData) {
  return String(formData.get("name") ?? "").trim();
}

export function getOptionalDescription(formData: FormData) {
  return String(formData.get("description") ?? "").trim();
}

export function getPositiveNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isInteger(value) && value > 0 ? value : null;
}
