import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Safely parses an ISO date or YYYY-MM-DD date-only string without UTC day shifting.
 */
export function parseDateSafe(dateString?: string | null): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const trimmed = dateString.trim();
  if (!trimmed) return null;

  // Match YYYY-MM-DD specifically to create calendar date without UTC offset shifting
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const d = new Date(year, month - 1, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a date string into a localized display format (e.g. "Oct 27, 2026").
 * Preserves the calendar day across all time zones.
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = parseDateSafe(dateString);
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Normalizes any valid date string or ISO timestamp to YYYY-MM-DD for HTML date inputs.
 */
export function toInputDateString(dateString?: string | null): string {
  if (!dateString || typeof dateString !== 'string') return "";
  const trimmed = dateString.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  try {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}
