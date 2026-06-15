# Cloud Mailbox System

A modern web interface for submitting messages and images that automatically sync to a local folder on the administrator's machine.

## Features

- **Clean, Modern UI** - Minimalist design centered on the message form
- **Multi-image Upload** - Drag & drop or click to upload up to 10 images (5MB each)
- **Cloud Storage** - Messages and images stored in Supabase (free tier)
- **Local Sync** - Automatic synchronization to local filesystem
- **Free Hosting** - Deploy on Vercel (free tier)

## Architecture

```
User (Browser) → Next.js (Vercel) → Supabase (DB + Storage) ← Node.js Sync (Local)
```

## Quick Start

### 1. Supabase Setup

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase-schema.sql`
3. Go to Storage and create a bucket named `message-images` (private)
4. Copy your project URL and keys from Settings > API

### 2. Frontend Deployment (Vercel)

1. Push this repo to GitHub
2. Import in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### 3. Local Sync Setup (Administrator's Machine)

```bash
# Navigate to scripts folder
cd scripts

# Install dependencies
npm install

# Create .env file with your Supabase credentials
cp ../.env.example .env
# Edit .env with your values

# Run sync (keeps running in background)
npm start
```

The sync script will:
- Poll Supabase every 30 seconds (configurable)
- Create folders: `C:\Users\pc\Desktop\database\from - [username]\[timestamp]\`
- Save `message.txt` and download all images
- Track synced messages to avoid duplicates

## Project Structure

```
cloud-mailbox/
├── src/
│   ├── app/
│   │   ├── api/messages/route.ts    # API endpoint for submissions
│   │   ├── page.tsx                  # Main page
│   │   ├── layout.tsx                # Layout
│   │   └── globals.css               # Global styles
│   ├── components/
│   │   └── MessageForm.tsx           # Message submission form
│   └── lib/
│       ├── supabase.ts               # Supabase client
│       └── types.ts                  # TypeScript types
├── scripts/
│   ├── sync.mjs                      # Local sync script
│   └── package.json                  # Sync script dependencies
├── supabase-schema.sql               # Database schema
├── .env.example                      # Environment template
└── package.json                      # Frontend dependencies
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes (backend + sync) |
| `LOCAL_SYNC_PATH` | Local folder for synced data | Yes (sync) |
| `SYNC_INTERVAL_MS` | Poll interval in milliseconds | No (default: 30000) |

## Local Folder Structure

```
C:\Users\pc\Desktop\database\
├── from - john\
│   └── 2024-01-15T10-30-45.000Z\
│       ├── message.txt
│       ├── metadata.json
│       ├── a1b2c3d4.jpg
│       └── e5f6g7h8.png
└── from - jane\
    └── 2024-01-15T11-00-00.000Z\
        ├── message.txt
        └── metadata.json
```

## Security

- File type validation (JPEG, PNG, GIF, WebP only)
- File size limit (5MB per image)
- Max 10 images per message
- Service role key only used server-side
- RLS policies restrict database access

## Development

```bash
# Install frontend dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## License

MIT