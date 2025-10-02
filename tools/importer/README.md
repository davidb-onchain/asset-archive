# Strapi Content Importer

## 1. Overview

This document outlines the plan for a standalone Node.js tool designed to batch-import content into the Strapi CMS. The primary purpose of this tool is to provide a consistent and repeatable way to seed the Strapi database with initial data, which is essential for setting up local development environments, staging servers, and for simplifying automated testing.

This tool will formalize and expand upon the functionality implicitly available in the `services/frontend/.content/` directory, which currently serves as a source for local demo data.

## 2. Migration and Functionality

The core of this tool will be a script that performs the following actions:

1.  **Reads Data Source**: The script will read the `products.json` file located at `services/frontend/.content/products.json` as its primary data source. This file contains a list of categories and products that will be imported.

2.  **Connects to Strapi**: It will connect to a running Strapi instance using environment variables for configuration (`STRAPI_URL`, `STRAPI_API_TOKEN`). This ensures the tool is flexible and can be pointed at any environment (local, staging, etc.) without code changes.

3.  **Imports Content**: The script will execute the import in a structured sequence:
    *   **Categories**: It will first iterate through the `categories` array in the JSON file and create each one in Strapi. It will check if a category with the same `slug` already exists to avoid duplicates.
    *   **Products**: Once categories are created, it will iterate through the `products` array. For each product, it will find the corresponding Strapi category ID(s) and then create the product, correctly establishing the relationship.

4.  **Provides Feedback**: The tool will provide clear, verbose output to the command line, indicating its progress (e.g., "Connecting to Strapi...", "Importing 5 categories...", "Importing 13 products...", "Import complete.").

## 3. Usage

The tool will be designed to be run from the command line. The intended workflow will be:

```bash
# Navigate to the importer tool directory
cd tools/importer

# Install dependencies
npm install

# Set environment variables for the target Strapi instance
export STRAPI_URL=http://localhost:1337
export STRAPI_API_TOKEN=your-strapi-api-token

# Run the import script
npm run import
```

## 4. Benefits

-   **Consistency**: Provides a single, reliable script for seeding any developer's machine with a standard dataset.
-   **Testability**: Makes it trivial to reset and re-seed a database for automated end-to-end or integration tests.
-   **Decoupling**: Separates the concern of data seeding from the frontend application, cleaning up the frontend's responsibility.
-   **Efficiency**: Automates a manual process, saving developer time and reducing the chance of errors.
