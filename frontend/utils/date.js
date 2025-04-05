/**
 * Date/time utility functions for the application
 */

/**
 * Format a Unix timestamp to a readable date and time
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date and time
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';
  
  // Convert seconds to milliseconds if needed
  const date = new Date(timestamp * 1000);
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format a Unix timestamp to a readable date only
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  // Convert seconds to milliseconds if needed
  const date = new Date(timestamp * 1000);
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Check if a given timestamp is in the past
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {boolean} True if the date is in the past
 */
export function isExpired(timestamp) {
  if (!timestamp) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return timestamp < now;
}

/**
 * Check if a given timestamp is within the next 48 hours
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {boolean} True if the date is within 48 hours
 */
export function isDateSoon(timestamp) {
  if (!timestamp) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const inTwoDays = now + (48 * 60 * 60); // 48 hours in seconds
  
  return timestamp >= now && timestamp <= inTwoDays;
}

/**
 * Calculate the number of days remaining until a given timestamp
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {number} Number of days remaining (0 if expired)
 */
export function daysRemaining(timestamp) {
  if (!timestamp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  if (timestamp <= now) return 0;
  
  const secondsRemaining = timestamp - now;
  return Math.ceil(secondsRemaining / (24 * 60 * 60)); // Convert seconds to days
}

/**
 * Format a timestamp to relative time (e.g., "in 2 days", "3 days ago")
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Relative time string
 */
export function timeFromNow(timestamp) {
  if (!timestamp) return 'N/A';
  
  const now = Math.floor(Date.now() / 1000);
  const diffInSeconds = timestamp - now;
  
  // If the time is in the past
  if (diffInSeconds < 0) {
    const absSeconds = Math.abs(diffInSeconds);
    
    if (absSeconds < 60) return 'il y a quelques secondes';
    if (absSeconds < 3600) return `il y a ${Math.floor(absSeconds / 60)} minute(s)`;
    if (absSeconds < 86400) return `il y a ${Math.floor(absSeconds / 3600)} heure(s)`;
    if (absSeconds < 2592000) return `il y a ${Math.floor(absSeconds / 86400)} jour(s)`;
    if (absSeconds < 31536000) return `il y a ${Math.floor(absSeconds / 2592000)} mois`;
    return `il y a ${Math.floor(absSeconds / 31536000)} an(s)`;
  }
  
  // If the time is in the future
  if (diffInSeconds < 60) return 'dans quelques secondes';
  if (diffInSeconds < 3600) return `dans ${Math.floor(diffInSeconds / 60)} minute(s)`;
  if (diffInSeconds < 86400) return `dans ${Math.floor(diffInSeconds / 3600)} heure(s)`;
  if (diffInSeconds < 2592000) return `dans ${Math.floor(diffInSeconds / 86400)} jour(s)`;
  if (diffInSeconds < 31536000) return `dans ${Math.floor(diffInSeconds / 2592000)} mois`;
  return `dans ${Math.floor(diffInSeconds / 31536000)} an(s)`;
} 