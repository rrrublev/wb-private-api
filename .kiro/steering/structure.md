# Project Structure

## Root Files
- `index.js` - Main entry point, exports core classes
- `package.json` - Project configuration and dependencies
- `README.md` - Documentation in Russian
- `.eslintrc.js` - ESLint configuration
- `jsconfig.json` - JavaScript project configuration

## Source Code (`src/`)
- `WBPrivateAPI.js` - Main API class with search and data methods
- `WBProduct.js` - Product model with methods for stocks, reviews, questions
- `WBCatalog.js` - Catalog container with pagination and search results
- `WBFeedback.js` - Feedback/review model
- `WBQuestion.js` - Product question model
- `Constants.js` - API URLs, destinations, warehouses, and configuration
- `Utils.js` - Utility functions for images, baskets, and query generation
- `SessionBuilder.js` - HTTP session management with axios

## Tests (`tests/`)
- Test files mirror source structure: `*.test.js`
- Comprehensive test coverage for API methods
- Tests written in Russian with descriptive names
- Uses Jest testing framework

## Architecture Patterns
- **Class-based OOP** - Main entities as ES6 classes
- **Factory pattern** - SessionBuilder creates configured axios instances
- **Model pattern** - Separate classes for Product, Catalog, Feedback, Question
- **Constants centralization** - All URLs and config in Constants.js
- **Utility separation** - Helper functions isolated in Utils.js

## Naming Conventions
- Classes: PascalCase (WBPrivateAPI, WBProduct)
- Files: PascalCase matching class names
- Methods: camelCase
- Constants: UPPER_SNAKE_CASE
- Test descriptions: Russian language, descriptive