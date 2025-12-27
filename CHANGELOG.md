# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

- **CLI Interface**: Pipe text to refine prompts via n8n webhook
- **Daemon Server**: Persistent background service with LRU caching for fast repeated refinements
- **VS Code Extension**: In-editor prompt refinement with "Refine Selection" and "Refine Clipboard" commands
- **Structured Logging**: JSON logging with configurable levels and automatic secret redaction
- **Cross-platform Support**: Clipboard support for macOS (pbcopy), Linux (xclip/xsel), and Windows (clip)
- **Retry Logic**: Exponential backoff for rate-limited requests (HTTP 429)
- **Input Validation**: Rate limiting and input sanitization for security
- **TypeScript Strict Mode**: Full type safety with `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- **CI Pipeline**: GitHub Actions workflow for lint, format, typecheck, and test
- **Test Suite**: Vitest unit tests for utilities, configuration, and core logic

### Technical Details

- Built with Bun runtime (Node.js compatible)
- Modular architecture with dependency injection
- Environment-based configuration via `.env`
- n8n workflow included for easy setup

## [Unreleased]

### Planned

- WebSocket support for real-time streaming
- Browser extension
- Integration with more AI providers
