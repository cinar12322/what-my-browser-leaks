# Repository Audit Report & Weakpoint Assessment

**Repository**: `what-my-browser-leaks`
**Description**: Zero-egress client-side browser fingerprint and privacy audit suite
**Audit Date**: November 2026
**Status**: Comprehensive Technical Assessment

---

## 1. Executive Summary

`what-my-browser-leaks` is a client-side web application built with [Astro](https://astro.build/) (v7), [Tailwind CSS](https://tailwindcss.com/) (v4), and [Vitest](https://vitest.dev/). Its primary objective is to inspect 15 distinct hardware, graphics, audio, and browser API vectors (Canvas 2D rasterization, WebGL chipset identification, AudioContext DSP frequency curves, installed system fonts, WebRTC candidate leaks, behavioral dynamics, etc.) to estimate user identifiability without server communication ("zero-egress").

While the codebase exhibits modern front-end practices, sleek UI presentation, and thoughtful entropy estimation modeling, this audit identified several **critical and medium-severity weakpoints** spanning security, privacy guarantees, architectural consistency, fingerprinting heuristics, and build/runtime dependencies.

---

## 2. Weakpoint Matrix & Severity Overview

| ID | Category | Title | Severity | Location |
|---|---|---|---|---|
| **VULN-01** | Security / XSS | DOM-based Cross-Site Scripting (XSS) via Unescaped Template Literal in `createRow` | **High** | `src/pages/index.astro:483-503` |
| **PRIV-01** | Privacy / Architecture | Third-Party Egress Paradox: Pre-Consent Google Fonts Leakage | **Medium** | `src/layouts/Layout.astro:15-22`, `src/components/LegalModals.astro` |
| **ARCH-01** | Code Quality / Architecture | Duplicate Logic & Decoupled Implementations (`index.astro` vs `fingerprint-utils.ts`) | **Medium** | `src/pages/index.astro` vs `src/lib/fingerprint-utils.ts` |
| **HEUR-01** | Fingerprint Robustness | Fragile and Non-Standard Detection Heuristics (WebRTC, Audio DSP, Adblock, Battery) | **Medium** | `src/pages/index.astro:554-754` |
| **ENV-01** | Environment & Build | Package Engine Mismatch (`package.json` vs Astro 7 runtime requirements) | **Medium** | `package.json:7` |
| **DEAD-01** | UI / Code Cleanliness | Dead DOM References & Orphaned Element Lookups | **Low** | `src/pages/index.astro:543, 608, 654, 701, 747` |

---

## 3. In-Depth Vulnerability & Weakpoint Analysis

### VULN-01: DOM-Based XSS in `createRow` via Unescaped Interpolation (High Severity)

#### Description
In `src/pages/index.astro`, the `createRow` function builds dynamic HTML rows from browser properties and injects them directly using `.innerHTML`:

```javascript
function createRow(label, value, note, riskBadge) {
  const safeVal = String(value ?? 'Unknown');
  ...
  return `
    <div class="data-row flex ...">
      <div class="flex flex-col min-w-0 pr-2">
        <span class="text-[11px] ...">${label}</span>
        <span class="font-mono text-[11px] ...">${safeVal}</span>
      </div>
      ...
      <button class="row-copy-btn ..." data-copy="${safeVal.replace(/"/g, '&quot;')}" ...>
      ...
    </div>
  `;
}
```

#### Exploit Scenario / Impact
1. `safeVal` is only loosely sanitized for double quotes inside the `data-copy` attribute (`safeVal.replace(/"/g, '&quot;')`), but is inserted raw into `${safeVal}` inside the `<span ...>${safeVal}</span>` element.
2. Multiple rows display user-controlled or client-modifiable data sources:
   - `navigator.userAgent`
   - `navigator.platform`
   - `navigator.vendor`
   - WebRTC candidate strings
   - WebGL debug strings (`ext.UNMASKED_RENDERER_WEBGL`, `ext.UNMASKED_VENDOR_WEBGL`)
3. In headless automation scripts, modified browsers, or anti-detect browser profiles (such as Puppeteer/Selenium instances, custom mobile WebView containers, or compromised client-side browser extensions), values such as User-Agent or WebGL unmasked renderer strings can be set to payloads like:
   ```html
   <img src=x onerror=alert(document.domain)>
   ```
4. When `container.innerHTML = [...]` is called, the unescaped HTML payload executes in the application context.

#### Remediation
- Use explicit HTML entity escaping utility before inserting values into HTML templates:
  ```typescript
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  ```
- Or construct DOM nodes using `document.createElement`, setting `textContent` rather than `.innerHTML`.

---

### PRIV-01: Third-Party Egress Paradox — Pre-Consent Google Fonts Leakage (Medium Severity)

#### Description
The project prominently markets itself as **"Zero-Egress Client Inspector"** and promises:
> *"No scanned hardware parameters, hashes, or IP addresses are sent to or stored on any server."*
> *"Zero-egress, client-side browser fingerprint and privacy audit suite."*

However, in `src/layouts/Layout.astro`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap"
  rel="stylesheet"
/>
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
  rel="stylesheet"
/>
```

#### Impact
1. When any user visits the site, their browser automatically issues DNS queries and HTTPS requests to `fonts.googleapis.com` and `fonts.gstatic.com` before any user interaction occurs.
2. Google servers receive the visitor's real external IP address, `User-Agent`, `Referer`, and TCP/TLS handshake details.
3. Although `src/components/LegalModals.astro` includes a cookie/font consent banner that attempts to disable font links (`link.setAttribute('disabled', 'true')`), this action occurs **after the page has already loaded and the HTTP request has already been executed**.
4. This undermines the project's zero-egress integrity guarantee.

#### Remediation
- Self-host fonts (e.g. `@fontsource/geist` and `@fontsource/jetbrains-mono`) or package font files as static local assets in `/public/fonts`.
- Ensure no third-party CDN requests are made upon initial page load.

---

### ARCH-01: Code Duplication & Architectural Decoupling (Medium Severity)

#### Description
The repository maintains two divergent implementations of core fingerprint utilities:
1. `src/lib/fingerprint-utils.ts`: Contains TypeScript exports for `computeSha256`, `calculateEntropy`, and `checkConsistency`. This file is covered by unit tests in `tests/fingerprint-utils.test.ts`.
2. `src/pages/index.astro`: Contains an inline, un-modularized `<script is:inline>` block that re-defines `computeSha256`, inline entropy calculations, and inline consistency checks from scratch rather than importing from `src/lib/fingerprint-utils.ts`.

#### Impact
- **False Test Confidence**: The Vitest suite in `tests/fingerprint-utils.test.ts` only tests `src/lib/fingerprint-utils.ts`. It does **not** test the actual code executed in the browser (`src/pages/index.astro`).
- Any bug fix, entropy tuning, or security enhancement applied to `fingerprint-utils.ts` does not take effect on the actual web dashboard.

#### Remediation
- Bundle the client-side logic using Astro's module script system (`<script>` instead of `<script is:inline>`), importing shared logic directly from `src/lib/fingerprint-utils.ts`.

---

### HEUR-01: Heuristic Fragilities & Blindspots in Fingerprint Vectors (Medium Severity)

#### 1. WebRTC ICE Candidate Regex & Timing Flaws
- In `src/pages/index.astro`:
  ```javascript
  const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(cand);
  ```
  - This regex matches any four 1-3 digit numbers, including non-IP candidate parameters (e.g., candidate foundation, priority, or port numbers if they happen to look like dot-separated numbers).
  - IPv6 local/global candidates are completely ignored.
  - The fallback `setTimeout(..., 2000)` can race against slow STUN handshakes or fire before gathering is complete.

#### 2. Adblocker Detection False Negatives/Positives
- The bait element detection:
  ```javascript
  const bait = document.createElement('div');
  bait.className = 'adsbox ad-placement pub_300x250 text-ad textAd sponsor-banner';
  bait.style.position = 'absolute';
  bait.style.left = '-9999px';
  ...
  if (bait.offsetParent === null || bait.offsetHeight === 0 || bait.offsetWidth === 0 || window.getComputedStyle(bait).display === 'none')
  ```
  - Because `left = '-9999px'` and width/height are set directly via inline style (`bait.style.width = '1px'`), modern declarative adblock engines (uBlock Origin, Brave Shields, AdGuard) which use cosmetic filtering stylesheet rules with `!important` will collapse or hide it, but browsers with element hiding disabled or script-based cosmetic blocking will fail to detect it. Furthermore, removing the node synchronously in the same event loop tick prevents certain asynchronous DOM-inspection blockers from triggering.

#### 3. Deprecated Battery API
- The Battery Status API (`navigator.getBattery()`) has been removed from Firefox and WebKit due to privacy fingerprinting concerns, and is progressively being restricted in Chromium. Relying on it as a "Critical" indicator causes frequent false "API Unsupported or Blocked" warnings.

#### 4. Audio DSP Latency and Flakiness
- The dynamics compressor values in `auditAudio()` extract 500 samples (`sampleValues.push(channelData[i])`). On differing hardware architectures (e.g. ARM64 vs x86_64, or varying sample rates), Web Audio DSP rounding can generate inconsistent hashes across sessions on the same machine when output sample rates shift (e.g., plugging in external DAC or headphones).

---

### ENV-01: Package Engine Mismatch (Medium Severity)

#### Description
`package.json` specifies:
```json
"engines": {
  "node": ">=20.0.0"
}
```
However, the dependencies specify `"astro": "^7.4.10"`. Astro 7 strictly requires Node.js version `Node >= 22.23.4`.

#### Impact
Developers or CI runners using supported Node 20.x or early Node 22.x LTS (e.g., Node `v22.22.1`) receive fatal build errors:
```
Node.js v22.22.1 is not supported by Astro!
Please upgrade Node.js to a supported version: ">=22.23.4"
```
Tests in `tests/build-integrity.test.ts` will fail unless the environment is manually switched to Node `>=22.23.4`.

#### Remediation
Update `package.json` engines field to reflect Astro 7 requirements:
```json
"engines": {
  "node": ">=22.23.4"
}
```
Add `.nvmrc` containing `22.23.4` or `lts/jod` to eliminate ambiguity.

---

### DEAD-01: Dead DOM Element References (Low Severity)

#### Description
In `src/pages/index.astro`, several functions attempt to update DOM elements that do not exist in the HTML template:
- `document.getElementById('top-screen-res')` (Line 543)
- `document.getElementById('top-canvas-hash')` (Line 608)
- `document.getElementById('top-webgl-gpu')` (Line 654)
- `document.getElementById('top-audio-hash')` (Line 701)
- `document.getElementById('top-font-count')` (Line 747)

#### Impact
While guarded by `if (topX) ...`, these statements represent dead code remnants from an earlier UI header design. They add unnecessary cognitive load and clutter to the engine script.

#### Remediation
Remove obsolete lookups or re-introduce the corresponding visual badges if intended in the layout.

---

## 4. Remediation & Hardening Roadmap

### Immediate Priorities
1. **Fix XSS Exposure**: Implement HTML entity escaping in `createRow` or replace `innerHTML` string concatenations with safe DOM nodes (`textContent`).
2. **Eliminate External Egress**: Replace external Google Fonts links in `Layout.astro` with bundled, locally served fonts to uphold the 100% Zero-Egress guarantee.
3. **Synchronize Code & Tests**: Modularize the client script in `src/pages/index.astro` to import and utilize the tested routines from `src/lib/fingerprint-utils.ts`.
4. **Align Node Engine Configuration**: Update `package.json` to enforce `"node": ">=22.23.4"` and provide an `.nvmrc` file.
5. **Clean Up Dead Code**: Remove orphaned DOM lookups (`top-*` IDs).

---

## 5. Conclusion

`what-my-browser-leaks` provides an intuitive, visually striking demonstration of client-side browser fingerprinting techniques. Addressing the DOM-based XSS vulnerability, replacing third-party external CDN fonts with self-hosted assets to honor the zero-egress commitment, and unifying the codebase with its test suite will significantly harden the project's security posture and technical credibility.
