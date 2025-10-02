# Asset Uploader Frontend

A Next.js-based frontend for uploading and managing Unity asset packages with real-time progress tracking and automated processing.

## Overview

This application provides an interactive web interface for uploading Unity `.unitypackage` files, replacing manual script-based processes with a user-friendly drag-and-drop interface. The system tracks upload progress in real-time and provides comprehensive status information for all upload jobs.

## Features

- **Drag & Drop Upload**: Intuitive file upload interface with support for multiple files
- **Real-time Progress Tracking**: Live updates of upload and processing status
- **Upload History**: Comprehensive table showing all past and current upload jobs
- **Status Indicators**: Visual feedback for different processing stages (Uploading, Processing, Scraping, Complete, Error)
- **Error Handling**: Retry functionality for failed uploads with detailed error messages
- **Responsive Design**: Mobile-first design that works on all devices
- **Mock Data**: Pre-populated with sample data for testing and demonstration

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **File Upload**: react-dropzone
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Date Formatting**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the uploader directory:
   ```bash
   cd uploader
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3001](http://localhost:3001) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
uploader/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main uploader page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── upload-dropzone.tsx
│   └── upload-status-table.tsx
├── lib/                   # Utility functions and mock data
│   ├── utils.ts          # Common utilities
│   └── mock-data.ts      # Sample data for testing
├── types/                 # TypeScript type definitions
│   └── upload.ts         # Upload-related types
└── public/               # Static assets
```

## Key Components

### UploadDropzone
- Handles drag-and-drop file selection
- Validates file types (.unitypackage only)
- Provides visual feedback for drag states
- Shows appropriate messages for different states

### UploadStatusTable
- Displays all upload jobs in a responsive table
- Shows real-time progress with progress bars
- Provides action buttons (Retry, View)
- Includes status icons and color coding
- Handles empty states gracefully

### Mock Data System
- Simulates backend behavior with realistic data
- Provides sample upload jobs in various states
- Includes progress simulation for active uploads
- Demonstrates error handling scenarios

## Upload Flow Simulation

The frontend simulates the complete upload flow described in the specification:

1. **File Selection**: User drags/drops files or clicks to browse
2. **Job Creation**: New upload jobs are created with PENDING status
3. **Upload Start**: Jobs transition to UPLOADING with progress tracking
4. **Processing Stages**: Automatic progression through PROCESSING → SCRAPING
5. **Completion**: Final status of COMPLETE with asset ID or ERROR with message

## Customization

### Adding New Status Types
Update the `UploadJobStatus` type in `types/upload.ts` and add corresponding UI logic in the status table component.

### Modifying Mock Data
Edit `lib/mock-data.ts` to change sample data or simulation behavior.

### Styling
The project uses Tailwind CSS with a custom design system. Modify `app/globals.css` and `tailwind.config.ts` for theme changes.

## Integration Notes

This frontend is designed to integrate with:
- A Node.js backend for file uploads and processing
- PostgreSQL database for persistent job state
- WebSocket connections for real-time updates
- Strapi CMS for final asset storage

When integrating with a real backend, replace the mock data and simulation functions with actual API calls.

## Development

### Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing the Interface

1. Load the page to see existing mock upload jobs
2. Drag and drop `.unitypackage` files (or any files for testing)
3. Watch real-time progress updates
4. Test retry functionality on failed uploads
5. Observe responsive behavior on different screen sizes

## Future Enhancements

- WebSocket integration for real-time updates
- Bulk operations (select multiple jobs)
- Filtering and sorting options
- Upload queue management
- Detailed job logs and metadata display
- Integration with authentication system 