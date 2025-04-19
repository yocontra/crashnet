import { type NextRequest, NextResponse } from "next/server"
import { fetchAndSimplify } from "@/lib/proxy-utils"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return new NextResponse(
      `<html>
        <head><title>Crashnet - Error</title></head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error: Missing URL</h1>
            <p>Please provide a URL to proxy.</p>
            <p><a href="/">Return to Homepage</a></p>
          </center>
        </body>
      </html>`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/html",
        },
      },
    )
  }

  try {
    // Normalize URL (add http:// if missing)
    let normalizedUrl = url
    // Add http:// if no protocol is specified
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `http://${normalizedUrl}`
    }
    // Replace https:// with http:// for vintage browser compatibility
    normalizedUrl = normalizedUrl.replace("https://", "http://")

    // Fetch and simplify the content
    const simplifiedContent = await fetchAndSimplify(normalizedUrl)

    // Return the simplified content
    return new NextResponse(simplifiedContent, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    return new NextResponse(
      `<html>
        <head><title>Crashnet - Error</title></head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error Fetching URL</h1>
            <p>${error instanceof Error ? error.message : "Unknown error"}</p>
            <p><a href="/">Return to Homepage</a></p>
          </center>
        </body>
      </html>`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      },
    )
  }
}
