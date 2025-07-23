# Project Structure

## Root Level
- `index.js` - Main entry point, exports core modules
- `package.json` - Project configuration and dependencies
- `README.md` - Documentation in Russian with usage examples
- `.eslintrc.js` - ESLint configuration with relaxed rules
- `jsconfig.json` - JavaScript project configuration

## Source Code (`src/`)
Core library modules following single responsibility principle:

- `WBPrivateAPI.js` - Main API client class with search and catalog methods
- `WBProduct.js` - Product entity with methods for stocks, feedbacks, questions
- `WBCatalog.js` - Catalog container for product collections
- `WBFeedback.js` - Feedback/review entity
- `WBQuestion.js` - Question entity
- `Constants.js` - Configuration constants (URLs, warehouses, destinations)
- `Utils.js` - Utility functions for image URLs, basket calculations
- `SessionBuilder.js` - HTTP session factory with axios configuration

## Tests (`tests/`)
Jest test files mirroring source structure:

- `*.test.js` - Unit tests for corresponding source modules
- Tests include error handling for 404/429 status codes
- 30-second timeouts for API calls
- Russian language test descriptions

## Development (`dev/`)
Development and example scripts:

- `collect-suppliers-data*.js` - Data collection utilities
- `example-supplier-catalog.js` - Usage examples

## Configuration Files
- `.kiro/` - Kiro IDE configuration and steering rules
- `.vscode/` - VS Code workspace settings
- `.github/` - GitHub workflows and templates
- `node_modules/` - Dependencies (excluded from version control)

## Naming Conventions
- **Classes**: PascalCase (WBPrivateAPI, WBProduct)
- **Files**: PascalCase for classes, camelCase for utilities
- **Methods**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE in Constants module
- **Variables**: camelCase, descriptive naming

## Module Organization
- Each class in separate file
- Clear separation between API client, entities, and utilities
- Constants centralized in single module
- Utilities grouped by functionality (Card, Brand, Search)