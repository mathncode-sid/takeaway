import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { listBlobs, putBlob } from './blobClient.js'

const LOCAL_CONFIG_PATH = join(process.cwd(), 'event-config.json')
const BLOB_CONFIG_NAME = 'event-config.json'

const DEFAULT_EVENT = {
  id: 'default-event',
  name: 'Default Event',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  shareableLink: null,
}

// Determine if running on Vercel (serverless environment)
function isVercelEnvironment() {
  return !!process.env.VERCEL || !!process.env.VERCEL_URL
}

/**
 * Load event configuration from Blob (Vercel) or local file (dev)
 */
export async function loadEventConfig() {
  try {
    if (isVercelEnvironment()) {
      // On Vercel: load from Blob storage
      const { blobs } = await listBlobs()
      const configBlob = blobs.find(b => (b.pathname || '').includes(BLOB_CONFIG_NAME))
      
      if (configBlob) {
        const response = await fetch(configBlob.url)
        const config = await response.json()
        return config
      }
      
      // No config in Blob yet, return default
      return { ...DEFAULT_EVENT }
    } else {
      // Local development: load from file system
      if (existsSync(LOCAL_CONFIG_PATH)) {
        const data = readFileSync(LOCAL_CONFIG_PATH, 'utf8')
        return JSON.parse(data)
      }
      return { ...DEFAULT_EVENT }
    }
  } catch (error) {
    console.warn('Could not load event config:', error.message)
    return { ...DEFAULT_EVENT }
  }
}

/**
 * Save event configuration to Blob (Vercel) or local file (dev)
 */
export async function saveEventConfig(config) {
  try {
    if (isVercelEnvironment()) {
      // On Vercel: save to Blob storage
      const configJson = JSON.stringify(config, null, 2)
      await putBlob(BLOB_CONFIG_NAME, configJson, { 
        access: 'public',
        contentType: 'application/json'
      })
    } else {
      // Local development: save to file system
      const configJson = JSON.stringify(config, null, 2)
      writeFileSync(LOCAL_CONFIG_PATH, configJson)
    }
  } catch (error) {
    console.error('Failed to save event config:', error)
    throw error
  }
}
