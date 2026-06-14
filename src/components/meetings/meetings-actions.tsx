'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { UploadModal } from './upload-modal'

export function MeetingsActions() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Upload Reunião
      </Button>
      <UploadModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
