/**
 * Generates sequence-suffixed document numbers, e.g. batch numbers like
 * `BLM240701A` (prefix + YYMMDD + letter sequence for same-day runs).
 */
export function formatDatePart(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** Converts a 0-based sequence index into A, B, ..., Z, AA, AB, ... */
export function sequenceToLetters(index: number): string {
  let n = index;
  let result = '';
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/** e.g. buildBatchNumber('BLM', new Date(), 0) => 'BLM240701A' */
export function buildBatchNumber(prefix: string, date: Date, sameDaySequence: number): string {
  return `${prefix}${formatDatePart(date)}${sequenceToLetters(sameDaySequence)}`;
}

/** e.g. buildRunningNumber('PO', 42, 6) => 'PO000042' */
export function buildRunningNumber(prefix: string, sequence: number, padLength = 6): string {
  return `${prefix}${String(sequence).padStart(padLength, '0')}`;
}
