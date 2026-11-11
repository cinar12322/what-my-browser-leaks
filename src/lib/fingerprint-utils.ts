// src/lib/fingerprint-utils.ts

/**
 * SHA-256 hash generator utility
 */
export async function computeSha256(text: string): Promise<string> {
  if (!text) return '';
  try {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'Conversion Error';
  }
}

/**
 * EFF (Panopticlick) model entropy & uniqueness calculator
 */
export function calculateEntropy(state: {
  hasCanvasHash: boolean;
  webglRenderer?: string;
  hasAudioHash: boolean;
  fontCount: number;
  hasScreen: boolean;
  hasHardware: boolean;
}) {
  let entropyBits = 10.5; // Base browser entropy

  if (state.hasCanvasHash) entropyBits += 8.3;
  if (state.webglRenderer && !state.webglRenderer.includes('Unknown') && !state.webglRenderer.includes('Hidden')) {
    entropyBits += 7.2;
  }
  if (state.hasAudioHash) entropyBits += 5.4;
  if (state.fontCount > 5) entropyBits += Math.min(state.fontCount * 0.4, 6.0);
  if (state.hasScreen) entropyBits += 3.5;
  if (state.hasHardware) entropyBits += 2.0;

  const totalBits = Math.min(Math.round(entropyBits * 10) / 10, 34.0);
  const score = Math.min(Math.round((totalBits / 34.0) * 100), 99);
  const oneInX = Math.round(Math.pow(2, totalBits));

  let level: 'critical' | 'moderate' | 'safe';
  let title: string;

  if (score >= 80) {
    level = 'critical';
    title = 'Extremely Unique';
  } else if (score >= 50) {
    level = 'moderate';
    title = 'Moderately Identifiable';
  } else {
    level = 'safe';
    title = 'Concealed in the Crowd';
  }

  return {
    totalBits,
    score,
    oneInX,
    level,
    title
  };
}

/**
 * Hardware & User-Agent consistency validation (Spoofing & anomaly detection)
 */
export function checkConsistency(nav: {
  userAgent: string;
  platform: string;
  maxTouchPoints?: number;
  isMobileUAData?: boolean;
  screenWidth?: number;
  screenAvailWidth?: number;
}) {
  const ua = (nav.userAgent || '').toLowerCase();
  const plat = (nav.platform || '').toLowerCase();
  const anomalies: string[] = [];

  if (ua.includes('windows') && (plat.includes('mac') || plat.includes('iphone'))) {
    anomalies.push('Critical: Declares Windows User-Agent but reports Mac/iOS platform!');
  }
  if (ua.includes('iphone') && plat.includes('linux') && !ua.includes('android')) {
    anomalies.push('Critical: Declares iPhone User-Agent but reports Linux platform!');
  }
  if (nav.isMobileUAData && nav.maxTouchPoints === 0) {
    anomalies.push('Suspicious: Declares mobile device but reports 0 touch points!');
  }
  if (nav.screenWidth !== undefined && nav.screenAvailWidth !== undefined) {
    if (nav.screenWidth < nav.screenAvailWidth) {
      anomalies.push('Anomaly: Total screen dimensions are smaller than available workspace!');
    }
  }

  return {
    isConsistent: anomalies.length === 0,
    anomalies,
    statusText: anomalies.length === 0 ? 'Fully Consistent (No Spoofing)' : `${anomalies.length} Anomaly Flags Detected!`
  };
}
