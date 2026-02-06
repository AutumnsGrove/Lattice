/**
 * Shared Color Utilities for Quota Components
 *
 * Centralizes color class definitions to ensure consistency
 * across QuotaWidget, QuotaWarning, and UpgradePrompt components.
 */

export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';
export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

/**
 * Color classes for status indicators (progress bars, badges)
 */
export const STATUS_COLORS: Record<StatusColor, {
  bg: string;
  fill: string;
  badge: string;
  text: string;
}> = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    fill: 'bg-green-500',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    text: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    fill: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    fill: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    text: 'text-red-600 dark:text-red-400',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    fill: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    text: 'text-gray-600 dark:text-gray-400',
  },
};

/**
 * Color classes for alert/banner variants
 */
export const ALERT_VARIANTS: Record<AlertVariant, {
  container: string;
  icon: string;
  title: string;
  text: string;
  button: string;
}> = {
  success: {
    container: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    title: 'text-green-800 dark:text-green-200',
    text: 'text-green-700 dark:text-green-300',
    button: 'bg-green-600 hover:bg-green-700 text-white',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    title: 'text-yellow-800 dark:text-yellow-200',
    text: 'text-yellow-700 dark:text-yellow-300',
    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-200',
    text: 'text-red-700 dark:text-red-300',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-200',
    text: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

/**
 * Get status color based on percentage used
 */
export function getStatusColorFromPercentage(percentage: number | null): StatusColor {
  if (percentage === null) return 'gray';
  if (percentage >= 100) return 'red';
  if (percentage >= 80) return 'yellow';
  return 'green';
}

/**
 * Get alert variant from status color
 */
export function getAlertVariantFromColor(color: StatusColor): AlertVariant {
  switch (color) {
    case 'green': return 'success';
    case 'yellow': return 'warning';
    case 'red': return 'error';
    default: return 'info';
  }
}
