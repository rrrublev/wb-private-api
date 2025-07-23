# Technology Stack

## Runtime & Language
- **Node.js** - JavaScript runtime environment
- **ES2021** - ECMAScript version with modern JavaScript features
- **CommonJS** - Module system (require/module.exports)

## Core Dependencies
- **axios** (^1.2.2) - HTTP client for API requests
- **axios-retry** (^3.5.0) - Automatic retry mechanism for failed requests
- **moment** (^2.30.1) - Date/time manipulation and formatting
- **qs** (^6.11.0) - Query string parsing and stringifying
- **string-format** (^2.0.0) - String formatting utilities

## Development Dependencies
- **jest** (^29.7.0) - Testing framework
- **eslint** - Code linting and style enforcement

## Build System & Commands

### Testing
```bash
npm test
```
Runs Jest test suite with verbose output and handles open handles detection.

### Installation
```bash
npm install
```
Standard npm package installation.

## Code Quality
- ESLint configuration with relaxed rules for console usage and async patterns
- Jest testing with 30-second timeouts for API calls
- Error handling for 404/429/5xx HTTP status codes
- Automatic retry mechanisms built into API calls

## Architecture Patterns
- Class-based architecture with clear separation of concerns
- Promise-based asynchronous operations
- Factory pattern for session building
- Utility modules for common operations
- Constants module for configuration management