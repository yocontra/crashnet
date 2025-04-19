import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 })
  }

  try {
    // Fetch the image with vintage browser headers
    const response = await fetch(url, {
      headers: {
        // Use a vintage browser User-Agent
        "User-Agent": "Mozilla/4.0 (compatible; MSIE 5.0; Mac_PowerPC)",

        // Accept common image formats
        Accept: "image/jpeg,image/gif,image/png,*/*",

        // Limited encoding support
        "Accept-Encoding": "identity",

        // Do not track to potentially get simpler content
        DNT: "1",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process the image with sharp
    const processedImageBuffer = await sharp(buffer)
      .jpeg({
        quality: 40,
        progressive: false,
      })
      // Limit maximum dimensions while preserving aspect ratio
      .resize({
        width: 640,
        height: 480,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer()

    // Return the processed image
    return new NextResponse(processedImageBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error("Error processing image:", error)

    // Return a simple placeholder image or error message
    return new NextResponse("Image Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }
}
