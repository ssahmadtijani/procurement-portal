import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  ORG_ADMIN: 'Org Admin',
  CORPORATE_OFFICE: 'Corporate Office',
  SUPPLIER: 'Supplier',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  FINANCE: 'Finance',
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  VERIFIED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  OPEN: 'bg-blue-100 text-blue-800',
  EVALUATION: 'bg-purple-100 text-purple-800',
  AWARDED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  SHORTLISTED: 'bg-purple-100 text-purple-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  APPROVED: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PUBLIC: 'bg-blue-100 text-blue-800',
  INVITED: 'bg-purple-100 text-purple-800',
  // Org types
  BUYER: 'bg-blue-100 text-blue-800',
  SUPPLIER_COMPANY: 'bg-indigo-100 text-indigo-800',
  // Roles
  PLATFORM_ADMIN: 'bg-red-100 text-red-800',
  ORG_ADMIN: 'bg-orange-100 text-orange-800',
  CORPORATE_OFFICE: 'bg-cyan-100 text-cyan-800',
  PROCUREMENT_OFFICER: 'bg-sky-100 text-sky-800',
  FINANCE: 'bg-emerald-100 text-emerald-800',
  SUPPLIER: 'bg-indigo-100 text-indigo-800',
  // Invitation statuses
  EXPIRED: 'bg-gray-100 text-gray-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REVOKED: 'bg-red-100 text-red-800',
};
