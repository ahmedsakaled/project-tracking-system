import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts Eastern Arabic (٠-٩) and Persian (۰-۹) digits in a string to Western English digits (0-9).
 */
export function toEnglishDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/**
 * Smart parses a single coordinate value string into a signed decimal number.
 * Examples:
 *   "N 33.315366" -> 33.315366
 *   "S 33.315366" -> -33.315366
 *   "E 43.760076" -> 43.760076
 *   "W 43.760076" -> -43.760076
 *   "33.315366° N" -> 33.315366
 *   "٣٣.٣١٥٣٦٦" -> 33.315366
 */
export function parseSingleCoordinate(rawStr: string | number | undefined | null): number | undefined {
  if (rawStr === undefined || rawStr === null || rawStr === "") return undefined;
  if (typeof rawStr === "number") return isNaN(rawStr) ? undefined : rawStr;

  let str = toEnglishDigits(rawStr).trim().toUpperCase();
  if (!str) return undefined;

  const isNegative = str.includes("S") || str.includes("W") || str.includes("-");

  // Check for DMS e.g., 33° 18' 55.3"
  const dmsMatch = str.match(/(\d+)\s*[°°]\s*(\d+)?\s*['′]?\s*(\d+(?:\.\d+)?)?\s*["″]?/);
  if (dmsMatch) {
    const deg = parseFloat(dmsMatch[1]) || 0;
    const min = parseFloat(dmsMatch[2]) || 0;
    const sec = parseFloat(dmsMatch[3]) || 0;
    let dec = deg + min / 60 + sec / 3600;
    if (isNegative && dec > 0) dec = -dec;
    return isNaN(dec) ? undefined : dec;
  }

  const numMatch = str.match(/[-+]?\d+(?:\.\d+)?/);
  if (!numMatch) return undefined;

  let val = parseFloat(numMatch[0]);
  if (isNaN(val)) return undefined;

  if (isNegative && val > 0) {
    val = -val;
  }
  return val;
}

/**
 * Smart parses combined coordinates string (e.g. pasted from Google Maps, WhatsApp, or GPS device).
 * Handles inputs like:
 *   "N 33.315366 E 43.760076"
 *   "N 33.315366, E 43.760076"
 *   "33.315366, 43.760076"
 *   "33.315366 N 43.760076 E"
 *   "N33.315366 E43.760076"
 */
export function parseCoordinatesInput(rawText: string | undefined | null): { lat?: number; lng?: number } {
  if (!rawText || !String(rawText).trim()) return {};

  const text = toEnglishDigits(rawText).trim();

  // Pattern 1: Explicit N/S (Lat) and E/W (Lng) indicators
  const latPartMatch = text.match(/(?:N|S|LAT|NORTH|SOUTH)\s*:?\s*[-+]?\d+(?:\.\d+)?|[-+]?\d+(?:\.\d+)?\s*(?:°|deg)?\s*(?:N|S|NORTH|SOUTH)/i);
  const lngPartMatch = text.match(/(?:E|W|LNG|LON|LONG|EAST|WEST)\s*:?\s*[-+]?\d+(?:\.\d+)?|[-+]?\d+(?:\.\d+)?\s*(?:°|deg)?\s*(?:E|W|EAST|WEST)/i);

  let lat: number | undefined;
  let lng: number | undefined;

  if (latPartMatch) {
    lat = parseSingleCoordinate(latPartMatch[0]);
  }
  if (lngPartMatch) {
    lng = parseSingleCoordinate(lngPartMatch[0]);
  }

  if (lat !== undefined && lng !== undefined) {
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Pattern 2: Extract all floating point numbers from string
  const numbers = text.match(/[-+]?\d+(?:\.\d+)?/g);
  if (numbers && numbers.length >= 2) {
    const rawN1 = parseFloat(numbers[0]);
    const rawN2 = parseFloat(numbers[1]);

    const idx1 = text.indexOf(numbers[0]);
    const idx2 = text.indexOf(numbers[1]);

    const strBefore1 = text.substring(0, idx1 + numbers[0].length + 4).toUpperCase();
    const strAround2 = text.substring(idx2 - 4).toUpperCase();

    const n1Negative = strBefore1.includes("S") || strBefore1.includes("W");
    const n2Negative = strAround2.includes("S") || strAround2.includes("W");

    let val1 = n1Negative && rawN1 > 0 ? -rawN1 : rawN1;
    let val2 = n2Negative && rawN2 > 0 ? -rawN2 : rawN2;

    const str1HasLngTag = strBefore1.includes("E") || strBefore1.includes("W") || strBefore1.includes("LNG") || strBefore1.includes("LON");
    const str1HasLatTag = strBefore1.includes("N") || strBefore1.includes("S") || strBefore1.includes("LAT");

    if (str1HasLngTag && !str1HasLatTag) {
      lng = val1;
      lat = val2;
    } else {
      if (lat === undefined) lat = val1;
      if (lng === undefined) lng = val2;
    }
  }

  if (lat !== undefined && Math.abs(lat) > 90) lat = undefined;
  if (lng !== undefined && Math.abs(lng) > 180) lng = undefined;

  return { lat, lng };
}


