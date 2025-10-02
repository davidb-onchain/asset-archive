# Plan: Unity Asset Store HTML Fetcher

This document outlines the plan to create a tool that automates fetching search result pages from the Unity Asset Store for later analysis.

## 1. Objective

The goal is to build a Node.js script using Puppeteer that reads `.unitypackage` filenames, uses them as search queries against the Unity Asset Store, and saves the fully rendered HTML of each search result page to an output directory.

- **Input Directory**: `/tools/extractor/files/`
- **Output Directory**: `/tools/extractor/output/`

## 2. Rationale & Strategy

As we discovered, directly fetching the Asset Store search URL with a simple tool like `curl` is ineffective. The website is a modern Single Page Application (SPA) where the search results are loaded dynamically using JavaScript after the initial page shell has been delivered.

**Why this approach is necessary:**

1.  **Dynamic Content**: We need to execute the page's JavaScript to get the actual search results. A standard HTTP request only retrieves the initial, mostly empty HTML template.
2.  **Headless Browser Emulation**: Puppeteer launches a real, albeit invisible, Chromium browser. It can run the JavaScript, wait for network requests to complete, and render the final page exactly as a user would see it.
3.  **Data Source**: This provides a reliable way to get the HTML containing the crucial `assetId` and product page URLs, which are not embedded in the `.unitypackage` files themselves. It is the "cheese it" method we discussed, allowing us to scrape the data we need without a formal API.

This tool represents the first critical step in our data enrichment pipeline: acquiring the raw data from which we will later parse the `assetId`.

## 3. Implementation Plan

### Step 1: Create the Scraper Script

The script will perform the following actions in sequence:

1.  **Import Libraries**: Import `puppeteer` and Node.js's built-in `fs` (file system) and `path` modules.
2.  **Define Directories**: Set constants for the input and output directories.
3.  **Read Input Files**:
    -   Read all filenames from the `/files/` directory.
    -   Filter the list to include only files ending in `.unitypackage`.
    -   If no files are found, exit gracefully with a message.
4.  **Main Processing Loop**: Iterate through each `.unitypackage` filename.
    -   **Generate Search Query**:
        -   Remove the `.unitypackage` extension.
        -   Replace characters like `-` and `_` with spaces to create a clean, human-readable search term.
    -   **Launch Puppeteer**:
        -   Start a new headless browser instance.
        -   Open a new page.
        -   Construct the search URL: `https://assetstore.unity.com/search?q=<URL-encoded-query>`
        -   Navigate to the URL.
    -   **Wait for Content**:
        -   This is the most critical step. The script must wait for the JavaScript to load and render the results. A robust way to do this is to use `page.waitForSelector()` with a selector that is unique to the search results container (e.g., a specific `div` class or `[data-testid]`).
        -   Include a reasonable timeout to prevent the script from hanging indefinitely on pages that fail to load or have no results.
    -   **Extract HTML**:
        -   Once the selector is found, grab the entire page's HTML content using `page.content()`.
    -   **Save Output**:
        -   Sanitize the original filename to create a valid output filename (e.g., `My Awesome Asset.unitypackage` -> `My Awesome Asset.unitypackage.html`).
        -   Save the extracted HTML to a new file in the `/output/` directory.
    -   **Log Progress**: Print status messages to the console (e.g., "Fetching 'My Awesome Asset'...", "Successfully saved HTML for 'My Awesome Asset'").
    -   **Cleanup**: Close the browser instance to free up resources. Use a `try...finally` block to ensure the browser is always closed, even if errors occur.

## 4. Execution Flow

1.  The user places one or more `.unitypackage` files into `/tools/extractor/files/`.
2.  The user navigates to the `/tools/extractor/` directory in their terminal.
3.  They run `npm install` once to download Puppeteer.
4.  They run the command to start the fetching process.
5.  The script will process each file sequentially, and the corresponding HTML files will appear in `/tools/extractor/output/`.
