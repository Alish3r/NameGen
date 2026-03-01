# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Versions 0.x are pre-1.0 and not considered production-ready. APIs and behavior may change.

## [Unreleased]

### Added
- (Changes go here before each release)

## [0.2.0] - 2025-02-27

### Added
- React ErrorBoundary for graceful error recovery
- Explicit Vitest test include pattern (`tests/**/*.test.ts`)
- Worker pool limiting (4 concurrent workers) for lower memory use

### Changed
- **Performance**: Blacklist `isBlacklisted()` now uses cached checker instead of reloading files
- **Performance**: Letter weights precomputed once per generation run (was per-name)
- **Performance**: Domain probe uses `flatMap` for cleaner, efficient domain list construction

### Fixed
- Potential memory pressure when generating large batches (10k+ names)

## [0.1.0] - 2025-02-27

### Added

**Core**
- Phonotactic name generator: 4–5 letter pronounceable names with crypto/fintech vibe
- Deterministic output when seed is provided
- Configurable letter pools, patterns, and scoring (vowel/consonant alternation, crypto bias, cluster penalties)
- English and crypto blacklists for filtering common/branded terms
- Public API: `generateNames()`, `probeDomains()`

**CLI**
- Generate names: `--count`, `--length`, `--seed`, `--minScore`, `--cryptoBias`, `--includeY`
- Domain probe: `probe --count --length --tlds com,net,io`
- JSON and CSV output formats

**Domain probe**
- DNS probe: NXDOMAIN / NO_ANSWER / RESOLVES
- HTTP probe when DNS resolves; fingerprint for parked/active detection
- Classifier: NO_DOMAIN, PARKED_OR_FOR_SALE, ACTIVE_SITE, INCONCLUSIVE

**Web UI**
- Vite + React app with worker-based generation
- Glassmorphism design system with warm dark palette (`#1a1614`)
- Aurora-style background glows
- Generate controls: count, length, seed, extended vowel set (ToggleField)
- Quality sliders: Pronounceability (red→amber), Crypto style (amber→purple)
- Quality presets: Balanced, Pronounceable, Crypto-heavy
- Per-section Reset actions (Generate, Quality)
- Results table with score meter, status pills (Available/Parked/Active/Unknown)
- Shortlist workflow: star names, copy shortlist, export shortlist CSV
- Step indicator: Generate → Shortlist → Check availability → Export
- Domain probe: Check availability for top 50 names × .com, .net, .io
- Table density toggle: Comfortable vs Compact
- Search, filter (available only, shortlist only), sort (score, name, available first)
- Keyboard shortcuts: `/` focus search, Cmd/Ctrl+Enter generate, Esc clear
- Slider tick marks at 0, 25, 50, 75, 100 with tooltip while dragging
- Editable numeric input for sliders with gradient track
- Full-width slider track with aligned tick marks

### Changed
- Warm dark palette: background `#1a1614`, accent gradient red→orange→amber
- Slider gradient track spans full width; pseudo-track transparent
- Status pills: Available=teal, Parked=amber, Active=red, Unknown=gray

### Fixed
- Slider bar gradient alignment (value 63 now renders at 63% correctly)

[Unreleased]: https://github.com/OWNER/REPO/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/OWNER/REPO/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/OWNER/REPO/releases/tag/v0.1.0
