'use client'

import React, { useState, useEffect } from 'react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { UploadStatusTable } from '@/components/upload-status-table'
import { Button } from '@/components/ui/button'
import { UploadJob, FileUpload, UploadJobStatus } from '@/types/upload'
import { mockUploadJobs, simulateJobProgress } from '@/lib/mock-data'
import { toast } from 'sonner'
import { RefreshCw, Upload } from 'lucide-react'

export default function UploaderPage() {
  const [jobs, setJobs] = useState<UploadJob[]>(mockUploadJobs)
  const [isUploading, setIsUploading] = useState(false)

  // Simulate real-time updates for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(job => 
      job.status === 'UPLOADING' || job.status === 'PROCESSING' || job.status === 'SCRAPING'
    )

    const intervals: NodeJS.Timeout[] = []

    activeJobs.forEach(job => {
      const interval = simulateJobProgress(job.id, (updatedJob) => {
        setJobs(prevJobs => 
          prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j)
        )
      })
      if (interval) intervals.push(interval)
    })

    return () => {
      intervals.forEach(clearInterval)
    }
  }, [jobs])

  const handleFilesSelected = async (fileUploads: FileUpload[]) => {
    setIsUploading(true)

    // Create new job entries
    const newJobs: UploadJob[] = fileUploads.map(fileUpload => ({
      id: fileUpload.id,
      originalFilename: fileUpload.file.name,
      status: 'PENDING' as UploadJobStatus,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    // Add to jobs list
    setJobs(prevJobs => [...newJobs, ...prevJobs])

    // Simulate upload process
    for (const job of newJobs) {
      // Start uploading
      setJobs(prevJobs => 
        prevJobs.map(j => 
          j.id === job.id 
            ? { ...j, status: 'UPLOADING' as UploadJobStatus, progress: 5, updatedAt: new Date() }
            : j
        )
      )
      
      // Small delay between starting each upload
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsUploading(false)
    toast.success(`Started processing ${fileUploads.length} file(s)`)
  }

  const handleRetry = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId
          ? { ...job, status: 'PENDING', progress: 0, errorMessage: undefined, updatedAt: new Date() }
          : job
      )
    )
    
    // Start the retry process
    setTimeout(() => {
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId
            ? { ...job, status: 'UPLOADING', progress: 5, updatedAt: new Date() }
            : job
        )
      )
    }, 1000)
    
    toast.info('Retrying upload...')
  }

  const handleRefresh = () => {
    // In a real app, this would fetch from the backend
    toast.info('Refreshed upload history')
  }

  const activeUploads = jobs.filter(job => 
    job.status === 'UPLOADING' || job.status === 'PROCESSING' || job.status === 'SCRAPING'
  ).length

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Asset Uploader</h1>
            <p className="text-muted-foreground mt-2">
              Upload Unity packages for automated processing and metadata extraction
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-8">
        <UploadDropzone 
          onFilesSelected={handleFilesSelected}
          disabled={isUploading}
        />
      </div>

      {/* Status Summary */}
      {activeUploads > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Upload className="h-4 w-4" />
            <span className="font-medium">
              {activeUploads} upload{activeUploads === 1 ? '' : 's'} in progress
            </span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Files are being processed automatically. You can safely leave this page.
          </p>
        </div>
      )}

      {/* Upload Status Table */}
      <UploadStatusTable 
        jobs={jobs}
        onRetry={handleRetry}
      />
    </div>
  )
} 