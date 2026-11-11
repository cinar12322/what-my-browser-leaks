import { describe, it, expect } from 'vitest';
import { computeSha256, calculateEntropy, checkConsistency } from '../src/lib/fingerprint-utils';

describe('Fingerprint Utility Suite', () => {

  describe('computeSha256', () => {
    it('returns empty string when given empty input', async () => {
      const res = await computeSha256('');
      expect(res).toBe('');
    });

    it('generates consistent 64-character SHA-256 hash for identical input', async () => {
      const hash1 = await computeSha256('FingerprintGuard_Canvas_2026');
      const hash2 = await computeSha256('FingerprintGuard_Canvas_2026');

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('generates collision-free different hashes for distinct inputs', async () => {
      const h1 = await computeSha256('TestA');
      const h2 = await computeSha256('TestB');
      expect(h1).not.toBe(h2);
    });
  });

  describe('calculateEntropy (EFF Panopticlick Model)', () => {
    it('computes maximum entropy and critical uniqueness when all signals are active', () => {
      const result = calculateEntropy({
        hasCanvasHash: true,
        webglRenderer: 'NVIDIA GeForce RTX 4070',
        hasAudioHash: true,
        fontCount: 25,
        hasScreen: true,
        hasHardware: true
      });

      expect(result.totalBits).toBeGreaterThan(30);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('critical');
      expect(result.title).toBe('Extremely Unique');
      expect(result.oneInX).toBeGreaterThan(1000000);
    });

    it('returns safe/low score when signals are restricted', () => {
      const result = calculateEntropy({
        hasCanvasHash: false,
        webglRenderer: 'Unknown',
        hasAudioHash: false,
        fontCount: 0,
        hasScreen: false,
        hasHardware: false
      });

      expect(result.totalBits).toBe(10.5);
      expect(result.score).toBeLessThan(50);
      expect(result.level).toBe('safe');
      expect(result.title).toBe('Concealed in the Crowd');
    });
  });

  describe('checkConsistency (Spoofing & Anomaly Tests)', () => {
    it('detects no anomalies for a coherent system profile', () => {
      const result = checkConsistency({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0',
        platform: 'Win32',
        maxTouchPoints: 0,
        isMobileUAData: false,
        screenWidth: 1920,
        screenAvailWidth: 1920
      });

      expect(result.isConsistent).toBe(true);
      expect(result.anomalies).toHaveLength(0);
      expect(result.statusText).toContain('Fully Consistent');
    });

    it('catches Windows User-Agent on Mac platform spoofing', () => {
      const result = checkConsistency({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'MacIntel',
        screenWidth: 1920,
        screenAvailWidth: 1920
      });

      expect(result.isConsistent).toBe(false);
      expect(result.anomalies[0]).toContain('Declares Windows User-Agent but reports Mac');
    });

    it('flags screen dimension smaller than available workspace', () => {
      const result = checkConsistency({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
        screenWidth: 1000,
        screenAvailWidth: 1200
      });

      expect(result.isConsistent).toBe(false);
      expect(result.anomalies[0]).toContain('Total screen dimensions are smaller than available workspace');
    });
  });

});
