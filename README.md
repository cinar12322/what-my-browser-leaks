# what-my-browser-leaks

A zero-egress, client-side browser fingerprint and privacy audit suite built with Astro, Tailwind CSS, and Vitest.

Tests 15 distinct hardware, graphics, audio, and API vectors to calculate client identifiability without server communication.

## Audited Vectors

- **Canvas 2D Rendering**: Sub-pixel rasterization hash (winding rules, alpha channel deviations).
- **WebGL & GPU**: Physical graphics chipset identification, vendor string, maximum texture dimensions, supported extension count.
- **AudioContext DSP**: OfflineAudioContext dynamics compressor frequency response and latency variance.
- **Font Detection**: Heuristic font presence detection across 40+ system font families via span width deviation.
- **Screen & Display**: Pixel scaling ratio (DPR), physical vs available workspace, color depth, dynamic range (HDR).
- **WebRTC Leak Testing**: STUN candidate reflection for private subnet IP and mDNS mask validation.
- **Hardware Profile**: CPU logical cores (`hardwareConcurrency`), RAM memory tier, multi-touch contact points.
- **Operating System & Time**: IANA timezone, UTC offset, system calendar, Intl formatting quirks.
- **Browser Capabilities**: User-Agent Client Hints, automation flags (`navigator.webdriver`), built-in PDF viewer.
- **Storage & Modern APIs**: LocalStorage, IndexedDB, Cache API, WebGPU, WebAssembly, Web Bluetooth, WebUSB.
- **Media Codecs**: Video (AV1, VP9, H.264) and audio (AAC, Opus) decoding capabilities, EME DRM support.
- **Behavioral Biometrics**: Cursor motion curves, keystroke dynamics, click and scroll telemetry counters.
- **Incognito & Adblock**: Storage quota heuristics for private browsing detection and bait element adblocker detection.
- **Spoofing Detection**: Cross-checks User-Agent headers against platform properties and hardware flags.
- **Zero-Egress Public IP**: Explicit on-demand query. No external network request occurs until requested.

## Tech Stack

- **Framework**: [Astro](https://astro.build/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Architecture**: 100% Client-Side Static (`output: static`)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/cinar12322/what-my-browser-leaks.git
cd what-my-browser-leaks
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:4321` in your browser.

### Build & Preview

```bash
npm run build
npm run preview
```

### Running Tests

```bash
npm test
```

## Privacy & Ethics

This tool does not collect, transmit, or store any fingerprint hashes or personal information. All calculations happen entirely within your local browser session.
