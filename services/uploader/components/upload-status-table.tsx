'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, XCircle, Loader2, Clock, FileText, ExternalLink } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { UploadJob, UploadJobStatus } from '@/types/upload'

interface UploadStatusTableProps {
  jobs: UploadJob[]
  onRetry?: (jobId: string) => void
}

const getStatusIcon = (status: UploadJobStatus) => {
  switch (status) {
    case 'COMPLETE':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'UPLOADING':
    case 'PROCESSING':
    case 'SCRAPING':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-600" />
    default:
      return <FileText className="h-4 w-4 text-gray-600" />
  }
}

const getStatusText = (status: UploadJobStatus) => {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'UPLOADING':
      return 'Uploading'
    case 'PROCESSING':
      return 'Processing'
    case 'SCRAPING':
      return 'Scraping Metadata'
    case 'COMPLETE':
      return 'Complete'
    case 'ERROR':
      return 'Failed'
    default:
      return status
  }
}

const getStatusColor = (status: UploadJobStatus) => {
  switch (status) {
    case 'COMPLETE':
      return 'text-green-600'
    case 'ERROR':
      return 'text-red-600'
    case 'UPLOADING':
    case 'PROCESSING':
    case 'SCRAPING':
      return 'text-blue-600'
    case 'PENDING':
      return 'text-yellow-600'
    default:
      return 'text-gray-600'
  }
}

export function UploadStatusTable({ jobs, onRetry }: UploadStatusTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No uploads yet</p>
        <p className="text-sm">Upload some Unity packages to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Upload History</h2>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">File</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Progress</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr 
                  key={job.id} 
                  className={`border-t ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{job.originalFilename}</p>
                        {job.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 truncate" title={job.errorMessage}>
                            {job.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Progress 
                        value={job.progress} 
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-muted-foreground tabular-nums flex-shrink-0">
                        {job.progress}%
                      </span>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {job.status === 'ERROR' && onRetry && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRetry(job.id)}
                        >
                          Retry
                        </Button>
                      )}
                      {job.status === 'COMPLETE' && job.assetId && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`/assets/${job.assetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 