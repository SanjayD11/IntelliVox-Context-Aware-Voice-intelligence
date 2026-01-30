/**
 * Mobile Detection Utility
 * Detects if the user is on a mobile device (phone/tablet)
 */

export function isMobileDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    // Check for touch support + small screen (typical mobile)
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    // Check user agent for mobile patterns
    const mobileUserAgentPatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Opera Mini/i,
        /IEMobile/i,
        /Mobile/i,
        /Tablet/i,
    ];

    const isMobileUserAgent = mobileUserAgentPatterns.some(pattern =>
        pattern.test(navigator.userAgent)
    );

    // Consider mobile if: (has touch AND small screen) OR mobile user agent
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
}

/**
 * Check if device is specifically iOS
 */
export function isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if device is specifically Android
 */
export function isAndroidDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android/.test(navigator.userAgent);
}
