import { OpenAPIHandler } from '@orpc/openapi/node'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/node'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import path from 'path'
import { auth } from './lib/auth'
import { createContext } from './lib/context'
import { appRouter } from './routers'
import { upload } from './routers/managment/upload'
import { validateFile } from './lib/fileUtils'

const app = express()

// Parse CORS_ORIGIN to support multiple origins (comma-separated)
const getAllowedOrigins = (): string[] => {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:9001'
  return corsOrigin.split(',').map((origin) => origin.trim())
}

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins()
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
  })
)

app.all('/api/auth{/*path}', toNodeHandler(auth))

// Serve static images - must be before orpc handlers
app.use('/images', express.static(path.join(process.cwd(), 'src', 'images')))

// Serve public files (including uploaded files)
app.use('/public', express.static(path.join(process.cwd(), 'src', 'public')))

// Global upload endpoint (reusable for all features)
app.post('/api/management/upload-temp-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Validate file
    const validation = validateFile(req.file)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    // Return file metadata
    return res.status(200).json({
      fileName: req.file.filename,
      tempPath: `/tmp/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    })
  }
})

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

app.use(async (req, res, next) => {
  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: '/rpc',
    context: await createContext({ req }),
  })
  if (rpcResult.matched) return

  const apiResult = await apiHandler.handle(req, res, {
    prefix: '/api',
    context: await createContext({ req }),
  })
  if (apiResult.matched) return

  next()
})

app.use(express.json())

app.get('/', (_req, res) => {
  res.status(200).send('OK')
})

export default app
