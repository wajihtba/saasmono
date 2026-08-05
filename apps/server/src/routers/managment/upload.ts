import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import { OrpcErrorHelper, getOrgId } from '../../lib/errors/orpc-errors'
import { authorized } from '../../lib/orpc'
import { Permission } from '../../types/rbac'
import {
  TEMP_DIR,
  validateFile,
  ensureDirectory,
  generateUniqueFileName,
  MAX_FILES_PER_NOTE,
} from '../../lib/fileUtils'

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDirectory(TEMP_DIR)
      cb(null, TEMP_DIR)
    } catch (error) {
      cb(error as Error, TEMP_DIR)
    }
  },
  filename: (req, file, cb) => {
    const uniqueFileName = generateUniqueFileName(file.originalname)
    cb(null, uniqueFileName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: MAX_FILES_PER_NOTE,
  },
  fileFilter: (req, file, cb) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      cb(new Error(validation.error))
    } else {
      cb(null, true)
    }
  },
})

export const uploadRouter = {
  // Global temp file upload endpoint (reusable)
  uploadTempFile: authorized(Permission.FILE_UPLOAD)
    .input(z.any()) // Files come from multipart/form-data, not JSON
    .output(
      z.object({
        fileName: z.string(),
        tempPath: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        originalName: z.string(),
      })
    )
    .route({
      method: 'POST',
      path: '/management/upload-temp-file',
      tags: ['File Upload'],
      summary: 'Upload file to temp directory',
      description: 'Uploads a single file to temporary storage and returns file metadata',
    })
    .handler(async ({ context, input }) => {
      const orgId = getOrgId(context)

      // File should be attached to request by multer middleware
      // This will be handled in the Express layer
      // For now, we'll throw an error if called directly
      throw OrpcErrorHelper.badRequest(
        'This endpoint should be called with multipart/form-data containing a file'
      )
    }),
}

// Export multer middleware for use in Express
export { upload }
