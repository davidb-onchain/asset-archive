import { UploadJob } from '@/types/upload'

export const mockUploadJobs: UploadJob[] = [
  {
    id: '1',
    originalFilename: 'RPG_Character_Pack.unitypackage',
    status: 'COMPLETE',
    progress: 100,
    assetId: 'asset-123',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:35:00Z'),
  },
  {
    id: '2',
    originalFilename: 'Modern_UI_Kit.unitypackage',
    status: 'PROCESSING',
    progress: 65,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    updatedAt: new Date('2024-01-15T11:03:00Z'),
  },
  {
    id: '3',
    originalFilename: 'Fantasy_Environment.unitypackage',
    status: 'ERROR',
    progress: 25,
    errorMessage: 'Failed to scrape metadata from Unity Asset Store',
    createdAt: new Date('2024-01-15T09:45:00Z'),
    updatedAt: new Date('2024-01-15T09:50:00Z'),
  },
  {
    id: '4',
    originalFilename: 'Particle_Effects_Pro.unitypackage',
    status: 'SCRAPING',
    progress: 85,
    createdAt: new Date('2024-01-15T11:15:00Z'),
    updatedAt: new Date('2024-01-15T11:18:00Z'),
  },
  {
    id: '5',
    originalFilename: 'Platformer_Controller.unitypackage',
    status: 'COMPLETE',
    progress: 100,
    assetId: 'asset-456',
    createdAt: new Date('2024-01-14T16:20:00Z'),
    updatedAt: new Date('2024-01-14T16:28:00Z'),
  },
]

// Simulate WebSocket updates for demo purposes
export const simulateJobProgress = (jobId: string, callback: (job: UploadJob) => void) => {
  const job = mockUploadJobs.find(j => j.id === jobId)
  if (!job || job.status === 'COMPLETE' || job.status === 'ERROR') return

  const interval = setInterval(() => {
    if (job.progress < 100) {
      job.progress = Math.min(job.progress + Math.random() * 10, 100)
      job.updatedAt = new Date()
      
      if (job.progress >= 100) {
        job.status = 'COMPLETE'
        job.assetId = `asset-${Math.random().toString(36).substr(2, 9)}`
        clearInterval(interval)
      } else if (job.status === 'UPLOADING' && job.progress > 30) {
        job.status = 'PROCESSING'
      } else if (job.status === 'PROCESSING' && job.progress > 70) {
        job.status = 'SCRAPING'
      }
      
      callback(job)
    } else {
      clearInterval(interval)
    }
  }, 1000)

  return interval
}