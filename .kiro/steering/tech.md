# Technology Stack

## Runtime & Language
- **Node.js** with CommonJS modules
- **JavaScript ES2021** features enabled
- Entry point: `index.js`

## Core Dependencies
- **axios** (^1.2.2) - HTTP client for API requests
- **axios-retry** (^3.5.0) - Automatic retry logic for failed requests
- **moment** (^2.30.1) - Date/time manipulation
- **qs** (^6.11.0) - Query string parsing
- **string-format** (^2.0.0) - String formatting utilities

## Development Dependencies
- **jest** (^29.7.0) - Testing framework
- **eslint** - Code linting

## Build & Test Commands
```bash
# Run tests
npm test

# Install dependencies
npm install

# Test library functionality
# Run tests to verify all API endpoints are working
```

## Code Style
- ESLint configuration with relaxed rules
- CommonJS module system (`require`/`module.exports`)
- Async/await preferred over promises
- Console logging allowed for debugging
- Flexible function naming conventions