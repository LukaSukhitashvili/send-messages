import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// CLI args
const RUN_ONCE = process.argv.includes('--once')
const RECHECK = process.argv.includes('--recheck')

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const LOCAL_SYNC_PATH = process.env.LOCAL_SYNC_PATH || (RUN_ONCE ? './synced-data' : 'C:\\\\Users\\\\pc\\\\Desktop\\\\database')
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SYNC_STATE_FILE = path.join(__dirname, 'sync-state.json')

function loadSyncState() {
  if (RECHECK) {
    console.log('⚡ Recheck mode: ignoring sync-state, will verify all messages')
    return new Set()
  }
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const data = fs.readFileSync(SYNC_STATE_FILE, 'utf-8')
      const state = JSON.parse(data)
      return new Set(state.map((s) => s.id))
    }
  } catch (error) {
    console.warn('Failed to load sync state:', error)
  }
  return new Set()
}

function saveSyncState(syncedIds) {
  try {
    const state = Array.from(syncedIds).map((id) => ({
      id,
      synced_at: new Date().toISOString()
    }))
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error('Failed to save sync state:', error)
  }
}

function sanitizeUsername(username) {
  return username.replace(/[<>:\"/\\\\|?*\x00-\x1F]/g, '_').trim()
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

async function syncMessages(syncedIds) {
  try {
    // Fetch messages not yet synced
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    if (!messages || messages.length === 0) {
      console.log('No messages found in database')
      return
    }

    const newMessages = messages.filter((msg) => !syncedIds.has(msg.id))
    
    if (newMessages.length === 0) {
      if (!RUN_ONCE) {
        console.log('No new messages (all caught up)')
      }
      return
    }

    const isCatchUp = syncedIds.size > 0 && !RUN_ONCE
    if (isCatchUp) {
      console.log(`📥 Catching up: ${newMessages.length} message(s) waiting from when laptop was offline`)
    } else {
      console.log(`Found ${newMessages.length} new message(s) to sync`)
    }

    for (const message of newMessages) {
      try {
        await syncSingleMessage(message)
        syncedIds.add(message.id)
        console.log(`✓ Synced message ${message.id} from ${message.username}`)
      } catch (error) {
        console.error(`✗ Failed to sync message ${message.id}:`, error)
      }
    }

    saveSyncState(syncedIds)
    
    if (isCatchUp) {
      console.log(`✓ Catch-up complete: ${newMessages.length} message(s) synced`)
    }
  } catch (error) {
    console.error('Sync error:', error)
  }
}

async function syncSingleMessage(message) {
  const sanitizedUsername = sanitizeUsername(message.username)
  const timestamp = new Date(message.created_at).toISOString().replace(/[:.]/g, '-')
  const messageDir = path.join(LOCAL_SYNC_PATH, `from - ${sanitizedUsername}`, timestamp)

  ensureDirectory(messageDir)

  // Save message text
  const messageFile = path.join(messageDir, 'message.txt')
  const messageContent = `From: ${message.username}\nDate: ${message.created_at}\n\n${message.message}`
  fs.writeFileSync(messageFile, messageContent, 'utf-8')

  // Fetch and download images
  const { data: images, error: imagesError } = await supabase
    .from('message_images')
    .select('*')
    .eq('message_id', message.id)

  if (imagesError) {
    console.error(`Error fetching images for message ${message.id}:`, imagesError)
    return
  }

  console.log(`  Found ${images?.length || 0} image(s) for message ${message.id}`)

  if (images && images.length > 0) {
    for (const image of images) {
      try {
        console.log(`  Attempting to download: ${image.file_name} (path: ${image.file_path})`)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('message-images')
          .createSignedUrl(image.file_path, 3600)

        if (urlError) {
          console.error(`  Signed URL error for ${image.id}:`, urlError)
          continue
        }

        if (urlData?.signedUrl) {
          const ext = path.extname(image.file_name) || '.jpg'
          const imageFile = path.join(messageDir, `${image.id}${ext}`)
          await downloadFile(urlData.signedUrl, imageFile)
          console.log(`  Downloaded image: ${image.file_name}`)
        } else {
          console.error(`  No signed URL returned for ${image.id}`)
        }
      } catch (error) {
        console.error(`  Failed to download image ${image.id}:`, error)
      }
    }
  }

  // Create a metadata file
  const metaFile = path.join(messageDir, 'metadata.json')
  fs.writeFileSync(metaFile, JSON.stringify({
    id: message.id,
    username: message.username,
    created_at: message.created_at,
    image_count: images?.length || 0
  }, null, 2))
}

async function main() {
  console.log('Starting Cloud Mailbox Sync')
  console.log(`Sync path: ${LOCAL_SYNC_PATH}`)
  const mode = RECHECK ? 'recheck' : (RUN_ONCE ? 'once' : 'continuous')
  console.log(`Mode: ${mode}`)

  ensureDirectory(LOCAL_SYNC_PATH)

  const syncedIds = loadSyncState()
  if (!RECHECK) {
    console.log(`Loaded ${syncedIds.size} previously synced message(s)`)
  }

  await syncMessages(syncedIds)

  if (!RUN_ONCE) {
    // Poll for new messages
    setInterval(async () => {
      await syncMessages(syncedIds)
    }, SYNC_INTERVAL_MS)

    console.log('Sync running... Press Ctrl+C to stop')
  } else {
    console.log('Sync complete.')
    process.exit(0)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nShutting down...')
  process.exit(0)
})

main().catch(console.error)