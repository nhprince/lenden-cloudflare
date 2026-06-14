/**
 * Utility functions for formatting values in the Lenden App
 */

/**
 * Format currency values with abbreviations for large numbers
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '৳')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = '৳'): string => {
    if (amount === null || amount === undefined) return `${currency} 0`;

    const absAmount = Math.abs(amount);
    const prefix = currency + ' ';

    // 10 Million+ = Crore (Cr)
    if (absAmount >= 10000000) {
        return `${prefix}${(amount / 10000000).toFixed(1)}Cr`;
    }

    // 100 Thousand+ = Lakh (L)
    if (absAmount >= 100000) {
        return `${prefix}${(amount / 100000).toFixed(1)}L`;
    }

    // 1 Thousand+ = K
    if (absAmount >= 1000) {
        return `${prefix}${(amount / 1000).toFixed(1)}K`;
    }

    // Regular formatting with 2 decimal places
    return `${prefix}${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

/**
 * Format currency without abbreviations (full number)
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '৳')
 * @returns {string} Formatted currency string
 */
export const formatCurrencyFull = (amount: number, currency: string = '৳'): string => {
    if (amount === null || amount === undefined) return `${currency} 0.00`;

    return `${currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

/**
 * Format date based on language preference
 * @param {string | Date} date - The date to format
 * @param {string} lang - Language code ('en' or 'bn')
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (
    date: string | Date,
    lang: 'en' | 'bn' = 'en',
    includeTime: boolean = false
): string => {
    if (!date) return '';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
    return d.toLocaleDateString(locale, options);
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string | Date} date - The date to format
 * @param {string} lang - Language code ('en' or 'bn')
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date: string | Date, lang: 'en' | 'bn' = 'en'): string => {
    if (!date) return '';

    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'bn') {
        if (diffMins < 1) return 'এখনই';
        if (diffMins < 60) return `${diffMins} মিনিট আগে`;
        if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
        if (diffDays < 7) return `${diffDays} দিন আগে`;
        return formatDate(date, lang);
    }

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(date, lang);
};

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone: string): string => {
    if (!phone) return '';

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format Bangladesh phone numbers (01XXXXXXXXX)
    if (cleaned.startsWith('880')) {
        const number = cleaned.substring(3);
        return `+880 ${number.substring(0, 2)} ${number.substring(2, 6)} ${number.substring(6)}`;
    }

    if (cleaned.startsWith('01') && cleaned.length === 11) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}-${cleaned.substring(8)}`;
    }

    return phone;
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Format large numbers with abbreviations
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num: number): string => {
    if (num === null || num === undefined) return '0';
    const absNum = Math.abs(num);
    if (absNum >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (absNum >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (absNum >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
};
