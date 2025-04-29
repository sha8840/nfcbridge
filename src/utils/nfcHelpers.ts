/**
 * Generates a unique session ID using crypto.randomUUID()
 * @returns A unique UUID string
 */
export const generateSessionId = (): string => {
  // Use crypto.randomUUID() if available, otherwise fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for browsers that don't support randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Creates a custom scheme URL for NFC scanning
 * @param sessionId The session ID to include in the URL
 * @returns A formatted custom scheme URL
 */
export const createCustomScheme = (sessionId: string): string => {
  return `nfcscan://scan?session_id=${sessionId}`;
};

/**
 * Parses URL parameters to extract NFC scan results
 * @returns An object containing session_id and tag_data if present
 */
export const parseUrlParameters = (): {
  sessionId: string | null;
  tagData: string | null;
} => {
  const params = new URLSearchParams(window.location.search);
  return {
    sessionId: params.get("session_id"),
    tagData: params.get("tag_data"),
  };
};
