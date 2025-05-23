import { type NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { normalizeUrl } from '@/lib/fetch'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '@/lib/config'

// Helper function to check if an image potentially has transparency
function isTransparentFormat(url: string): boolean {
  // Check data URI for transparent formats
  if (
    url.startsWith('data:image/svg') ||
    url.startsWith('data:image/png') ||
    url.startsWith('data:image/gif') ||
    url.startsWith('data:image/webp')
  ) {
    return true
  }

  // Or check file extension for transparent formats
  if (!url.startsWith('data:')) {
    const lowercaseUrl = url.toLowerCase()
    if (
      lowercaseUrl.endsWith('.svg') ||
      lowercaseUrl.endsWith('.png') ||
      lowercaseUrl.endsWith('.gif') ||
      lowercaseUrl.endsWith('.webp')
    ) {
      return true
    }
  }

  return false
}

// Helper function to check if content is an image
function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing URL parameter', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  try {
    let buffer: Buffer
    let contentType: string = 'application/octet-stream'

    if (url.startsWith('data:')) {
      try {
        // Extract MIME type
        const mimeMatch = url.match(/^data:([^;,]+)/)
        contentType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'

        // Extract base64 data
        const dataStartIndex = url.indexOf(',')
        if (dataStartIndex === -1) {
          throw new Error('Invalid data URL format - no comma found')
        }
        const base64Data = url.substring(dataStartIndex + 1)
        if (!base64Data) {
          throw new Error('Invalid data URL format - no data after comma')
        }
        buffer = Buffer.from(base64Data, 'base64')
      } catch (error) {
        console.error('Error processing data URL:', error)
        throw new Error('Failed to process data URL')
      }
    } else {
      const normalizedUrl = normalizeUrl(url, false)
      const response = await fetch(normalizedUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`)
      }

      contentType = response.headers.get('content-type') || 'application/octet-stream'
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }

    // If not an image, return the content as-is
    if (!isImageContentType(contentType)) {
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // For images, process them
    const useTransparency = isTransparentFormat(url)

    // Process the image based on format
    const processedImageBuffer = await (useTransparency
      ? sharp(buffer)
          .png({ compressionLevel: 6 })
          .resize({
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true,
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .toBuffer()
      : sharp(buffer)
          .jpeg({
            quality: 40,
            progressive: false,
          })
          .resize({
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer())

    return new NextResponse(processedImageBuffer, {
      headers: {
        'Content-Type': useTransparency ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Error processing image:', error)

    return new NextResponse('Image Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
