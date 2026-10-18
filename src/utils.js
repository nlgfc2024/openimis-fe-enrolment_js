export function isBase64Encoded(value) {
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

export function isEmptyObject(value) {
  return Object.keys(value).length === 0;
}
