/** Removes spaces, line breaks, quotes and invisible characters picked up when pasting a key. */
export function cleanKey(key: string) {
  return key.replace(/[^\x21-\x7E]/g, "").replace(/^["'`]+|["'`]+$/g, "");
}
