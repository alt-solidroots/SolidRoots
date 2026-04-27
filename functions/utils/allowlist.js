// Simple IP allow-list utilities

export function parseAllowList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export function isIpAllowed(ip, allowList) {
  // If no allow-list configured, treat as allowed (default-allow). If configured, enforce.
  if (!allowList || allowList.length === 0) return true;
  return allowList.includes(ip);
}
