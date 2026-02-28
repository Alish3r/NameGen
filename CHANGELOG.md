# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (Changes go here before each release)

## [1.0.0] - 2025-02-27

### Added
- Glassmorphism UI design system with warm dark palette
- Aurora-style background glows
- Shortlist workflow (rename from Favorites): copy, export CSV, badge count
- Step indicator: Generate → Shortlist → Check availability → Export
- Table density toggle: Comfortable vs Compact
- Keyboard shortcuts: `/` focus search, Cmd/Ctrl+Enter generate, Esc clear
- Slider tick marks at 0, 25, 50, 75, 100 with tooltip while dragging
- Editable numeric input for sliders with gradient track
- ToggleField component for Extended vowel set
- Quality presets: Balanced, Pronounceable, Crypto-heavy
- Per-section Reset actions (Generate, Quality)
- Full-width slider track with aligned tick marks

### Changed
- Warm dark palette: background `#1a1614`, accent gradient red→orange→amber
- Slider gradient track spans full width; pseudo-track transparent
- Status pills: Available=teal, Parked=amber, Active=red, Unknown=gray

### Fixed
- Slider bar gradient alignment (value 63 now renders at 63% correctly)

[Unreleased]: https://github.com/OWNER/REPO/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/OWNER/REPO/releases/tag/v1.0.0
