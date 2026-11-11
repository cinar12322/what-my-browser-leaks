import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Astro Build & DOM Integrity Tests', () => {

  it('dist/index.html should be successfully generated', () => {
    const distHtmlPath = path.resolve(process.cwd(), 'dist/index.html');
    const exists = fs.existsSync(distHtmlPath);
    expect(exists).toBe(true);
  });

  it('contains all 15 audit category cards and critical element identifiers', () => {
    const distHtmlPath = path.resolve(process.cwd(), 'dist/index.html');
    const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');

    // Key interactive IDs
    expect(htmlContent).toContain('id="canvas-fingerprint-preview"');
    expect(htmlContent).toContain('id="uniqueness-gauge-circle"');
    expect(htmlContent).toContain('id="gauge-score-value"');
    expect(htmlContent).toContain('id="metric-entropy-bits"');
    expect(htmlContent).toContain('id="metric-audited-count"');
    expect(htmlContent).toContain('id="btn-copy-markdown"');
    expect(htmlContent).toContain('id="btn-download-json"');
    expect(htmlContent).toContain('id="btn-rescan-all"');
    expect(htmlContent).toContain('id="btn-request-ip"');

    // 15 Category card data-attributes
    expect(htmlContent).toContain('data-category="cat-browser"');
    expect(htmlContent).toContain('data-category="cat-screen"');
    expect(htmlContent).toContain('data-category="cat-hardware"');
    expect(htmlContent).toContain('data-category="cat-locale"');
    expect(htmlContent).toContain('data-category="cat-canvas"');
    expect(htmlContent).toContain('data-category="cat-webgl"');
    expect(htmlContent).toContain('data-category="cat-audio"');
    expect(htmlContent).toContain('data-category="cat-fonts"');
    expect(htmlContent).toContain('data-category="cat-webrtc"');
    expect(htmlContent).toContain('data-category="cat-network"');
    expect(htmlContent).toContain('data-category="cat-storage"');
    expect(htmlContent).toContain('data-category="cat-codecs"');
    expect(htmlContent).toContain('data-category="cat-behavior"');
    expect(htmlContent).toContain('data-category="cat-privacy"');
    expect(htmlContent).toContain('data-category="cat-consistency"');
  });

  it('contains clean craftsmanship styling, Google Fonts, and Compliance Modals', () => {
    const distHtmlPath = path.resolve(process.cwd(), 'dist/index.html');
    const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');

    // Craftsmanship UI
    expect(htmlContent).toContain('console-card');
    expect(htmlContent).toContain('fonts.googleapis.com');

    // Legal & Cookie Compliance components
    expect(htmlContent).toContain('id="cookie-consent-banner"');
    expect(htmlContent).toContain('id="cookie-settings-modal"');
    expect(htmlContent).toContain('id="privacy-policy-modal"');
    expect(htmlContent).toContain('id="terms-modal"');
    expect(htmlContent).toContain('Privacy Policy');
    expect(htmlContent).toContain('Terms of Service');
  });

});
