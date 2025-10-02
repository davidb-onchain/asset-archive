'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { FileUpload } from '@/types/upload'

interface UploadDropzoneProps {
  onFilesSelected: (files: FileUpload[]) => void
  disabled?: boolean
}

export function UploadDropzone({ onFilesSelected, disabled = false }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast.error(`${rejectedFiles.length} file(s) were rejected. Only .unitypackage files are allowed.`)
    }

    if (acceptedFiles.length > 0) {
      const fileUploads: FileUpload[] = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9)
      }))
      
      onFilesSelected(fileUploads)
      toast.success(`${acceptedFiles.length} file(s) selected for upload`)
    }
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.unitypackage'],
    },
    disabled,
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  const getDropzoneStyles = () => {
    let baseStyles = "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
    
    if (disabled) {
      return `${baseStyles} border-muted bg-muted/20 cursor-not-allowed`
    }
    
    if (isDragReject) {
      return `${baseStyles} border-destructive bg-destructive/10 text-destructive`
    }
    
    if (isDragAccept || isDragActive) {
      return `${baseStyles} border-primary bg-primary/10 text-primary`
    }
    
    return `${baseStyles} border-border hover:border-primary hover:bg-primary/5`
  }

  return (
    <div {...getRootProps()} className={getDropzoneStyles()}>
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        {isDragReject ? (
          <>
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <p className="text-lg font-medium">Invalid file type</p>
              <p className="text-sm text-muted-foreground">Only .unitypackage files are supported</p>
            </div>
          </>
        ) : (
          <>
            {isDragActive ? (
              <Upload className="h-12 w-12 text-primary animate-bounce" />
            ) : (
              <FileIcon className="h-12 w-12 text-muted-foreground" />
            )}
            
            <div>
              {disabled ? (
                <>
                  <p className="text-lg font-medium text-muted-foreground">Upload disabled</p>
                  <p className="text-sm text-muted-foreground">Please wait for current uploads to complete</p>
                </>
              ) : isDragActive ? (
                <>
                  <p className="text-lg font-medium">Drop your Unity packages here</p>
                  <p className="text-sm text-muted-foreground">Release to start uploading</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Drag & drop Unity packages here</p>
                  <p className="text-sm text-muted-foreground">
                    or <span className="text-primary underline">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports .unitypackage files only
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 