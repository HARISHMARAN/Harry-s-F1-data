# Project Organization Guide

## Overview
This documentation serves as a guide for organizing the repository of the F1 Dashboard application. It outlines the project structure, file organization standards, and best practices for development.

## Project Structure

```
F1-dashboard/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── public/
├── tests/
├── docs/
└── README.md
```

### Directory Purposes
- **src/**: This directory contains all the source code for the application.
  - **components/**: Reusable UI components.
  - **pages/**: Page-level components or views.
  - **services/**: API service calls and related logic.
  - **utils/**: Utility functions and helpers.
- **public/**: Static files such as images and icons.
- **tests/**: Unit and integration tests.
- **docs/**: Documentation files.
- **README.md**: Project introduction and setup instructions.

## File Organization Standards
- Use clear and descriptive names for directories and files.
- Keep related files together in appropriate folders.
- Follow a consistent naming convention (e.g., camelCase, kebab-case).
- Avoid deep nesting of directories to maintain accessibility.

## Best Practices for Development
- Write clear and concise commit messages.
- Follow coding standards and linting rules.
- Maintain up-to-date documentation and comments in code.
- Use pull requests for code reviews before merging.
- Ensure thorough testing before deploying any changes.
