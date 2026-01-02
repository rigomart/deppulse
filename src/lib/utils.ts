import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function formatAge(date: Date): string {
  const ms = Date.now() - date.getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));
  if (years >= 1) return `${years} year${years > 1 ? "s" : ""} ago`;
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
