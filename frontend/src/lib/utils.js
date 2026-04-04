import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTL(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY', maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${n} ₺`;
  }
}

export function formatDate(dateStr, fmt = 'd MMMM yyyy') {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, fmt, { locale: tr });
  } catch {
    return dateStr;
  }
}

export function gunIfadesi(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (isToday(d)) return 'bugün';
    if (isTomorrow(d)) return 'yarın';
    if (isYesterday(d)) return 'dün';
    return format(d, 'EEEE d MMMM', { locale: tr });
  } catch {
    return dateStr;
  }
}

export function phoneToWa(tel) {
  if (!tel) return '';
  let digits = String(tel).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('90')) digits = '90' + digits;
  return digits;
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
