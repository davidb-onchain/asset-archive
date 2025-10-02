export type UploadJobStatus = 
  | 'PENDING'
  | 'UPLOADING' 
  | 'PROCESSING'
  | 'SCRAPING'
  | 'COMPLETE'
  | 'ERROR'

export interface UploadJob {
  id: string
  originalFilename: string
  status: UploadJobStatus
  progress: number
  errorMessage?: string
  assetId?: string
  createdAt: Date
  updatedAt: Date
}

export interface FileUpload {
  file: File
  id: string
} 