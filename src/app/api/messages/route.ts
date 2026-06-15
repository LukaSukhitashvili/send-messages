import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGES = 10

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const username = formData.get('username') as string
    const message = formData.get('message') as string
    const images = formData.getAll('images') as File[]

    // Validation
    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_IMAGES} images allowed` },
        { status: 400 }
      )
    }

    // Validate images
    for (const image of images) {
      if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${image.type}. Allowed: JPEG, PNG, GIF, WebP` },
          { status: 400 }
        )
      }
      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File ${image.name} exceeds 5MB limit` },
          { status: 400 }
        )
      }
    }

    const supabase = createServerClient()
    const messageId = uuidv4()
    const timestamp = new Date().toISOString()

    // Insert message metadata
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        username: username.trim(),
        message: message.trim(),
        created_at: timestamp
      })

    if (messageError) {
      console.error('Message insert error:', messageError)
      return NextResponse.json(
        { success: false, error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Upload images to Supabase Storage
    const imageRecords = []
    for (const image of images) {
      const imageId = uuidv4()
      const fileExt = image.name.split('.').pop() || 'jpg'
      const fileName = `${imageId}.${fileExt}`
      const filePath = `${messageId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, image, {
          contentType: image.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        return NextResponse.json(
          { success: false, error: `Failed to upload image: ${uploadError.message}` },
          { status: 500 }
        )
      }

      imageRecords.push({
        id: imageId,
        message_id: messageId,
        file_name: image.name,
        file_path: filePath,
        file_size: image.size,
        mime_type: image.type,
        created_at: timestamp
      })
    }

    // Insert image metadata
    if (imageRecords.length > 0) {
      const { error: imagesError } = await supabase
        .from('message_images')
        .insert(imageRecords)

      if (imagesError) {
        console.error('Images metadata insert error:', imagesError)
      }
    }

    return NextResponse.json({
      success: true,
      messageId
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}