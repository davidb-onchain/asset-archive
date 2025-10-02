# Asset Store HTML Parsing Plan (`extract.md`)

## 1. Objective

Read the pre-fetched HTML files from `extractor/output/html`, parse them to identify the most relevant asset for each search query, and extract a structured set of metadata for that asset. The final output will be a clean JSONL file mapping each source `.unitypackage` file to its best-match asset details.

## 2. Parsing Strategy (per HTML file)

The `parse.js` script will be updated to perform the following steps for each HTML file in the `output/html` directory.

### Step 2.1: Load and Pre-process
- Read the HTML file content.
- Load the content into a `cheerio` instance for server-side DOM traversal.
- Extract the original search query from the HTML filename (e.g., `3D_Characters_Pro_Fantasy.html` -> "3D Characters Pro Fantasy").

### Step 2.2: Identify Asset Containers
- The primary container for each search result is the `<article>` element.
- The script will iterate through every `<article>` element on the page to treat it as a potential asset candidate.

### Step 2.3: Extract Data from Each `<article>`
For each article, the script will extract the following fields using specific `cheerio` selectors:

- **Product Name**:
  - **Selector**: Find the primary `<a>` tag that also contains the product title. This is often a direct child or nested within an `<h2>` or `<h3>`. We'll target something like `article a[aria-label]` or a specific class that holds the title.
  - **Extraction**: Get the text content of this element.

- **Product URL & Asset ID**:
  - **Selector**: The same `<a>` tag used for the name.
  - **Extraction**:
    - Get the `href` attribute.
    - Construct the full absolute URL.
    - Use a regex (`/-(\d+)(?:[/?#]|$)/`) to extract the numeric **Asset ID** from the URL.

- **Publisher Name & URL**:
  - **Selector**: Find the `<a>` tag inside the `<article>` where the `href` attribute starts with `/publishers/`.
  - **Extraction**:
    - Get the `href` attribute for the **Publisher URL**.
    - Get the text content for the **Publisher Name**.

- **Thumbnail URL**:
  - **Selector**: Find the `<img>` element within the `<article>`. It often has a specific class related to thumbnails or previews.
  - **Extraction**: Get the `src` attribute.

- **Rating**:
  - **Selector**: This is often represented by `<span>` elements within a `<div>` that has an `aria-label` like "5 star rating". We will need to inspect the HTML to find the exact structure. It might involve counting elements with a "filled star" class.
  - **Extraction**: Parse the `aria-label` or count the star elements to get a numeric rating (e.g., 4.5).

### Step 2.4: Score and Select the Best Match
- After extracting data from all `<article>` elements, each candidate asset will be scored against the original search query.
- **Scoring Algorithm**: A simple token-based similarity score will be used.
  1.  Normalize both the query and the extracted product name (lowercase, remove punctuation).
  2.  Split both strings into word tokens.
  3.  Calculate the number of matching words.
  4.  The asset with the highest number of matching words is the "best match".
- The script will select the single best-matching asset's data for output.

## 3. Output Format

The `parse.js` script will write to `extractor/output/parsed_results.jsonl`. Each line will be a JSON object representing the best match for a single input file:

```json
{
  "sourceFile": "3D Characters Pro - Fantasy.unitypackage",
  "searchQuery": "3D Characters Pro Fantasy",
  "assetId": "12345",
  "productName": "Customizable 3D Characters - Pro Fantasy Pack",
  "productUrl": "https://assetstore.unity.com/packages/3d/characters/customizable-3d-characters-pro-fantasy-pack-12345",
  "publisherName": "Cool Asset Creator",
  "publisherUrl": "https://assetstore.unity.com/publishers/9876",
  "thumbnailUrl": "https://assetstore-cdn.unity3d.com/package-screenshot/image.jpg",
  "rating": 4.8,
  "matchConfidence": 0.95 
}
```

## 4. Implementation Plan for `parse.js`

1.  **Dependencies**: Keep `cheerio` and `yargs`.
2.  **File Reading**: Loop through all `.html` files in `output/html`.
3.  **Core Logic**:
    - Create an `extractAssetDataFromArticle(articleElement)` function that takes a cheerio element and returns a structured object with the fields defined in Step 2.3.
    - Create a `calculateMatchScore(query, title)` function.
    - For each HTML file:
      - Map over all `<article>` elements, calling `extractAssetDataFromArticle`.
      - Score each resulting asset object.
      - Find the asset with the highest score.
      - Write the final, best-match object to the output JSONL file.
4.  **Refine Selectors**: The initial implementation will require inspecting the saved HTML files to determine the precise CSS selectors for each data point, as these can change with website updates. 