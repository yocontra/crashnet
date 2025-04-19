import { JSDOM } from "jsdom"
import { minify } from "html-minifier-terser"
import { simplify } from "./simplify"

// Define a type for the return value
export interface SimplifiedContent {
  title: string
  content: string
}

export async function fetchAndSimplify(url: string): Promise<SimplifiedContent> {
  try {
    // Fetch the URL with headers that indicate an old browser
    const response = await fetch(url, {
      headers: {
        // Use a vintage browser User-Agent
        "User-Agent": "Mozilla/4.0 (compatible; MSIE 5.0; Mac_PowerPC)",

        // Indicate preference for simple HTML content
        Accept: "text/html,text/plain",
        "Accept-Language": "en-US,en;q=0.5",

        // Limited encoding support
        "Accept-Encoding": "identity",

        // Indicate limited capabilities
        "X-Requested-With": "XMLHttpRequest",

        // Request simple content when available
        "Save-Data": "on",

        // Do not track to potentially get simpler content
        DNT: "1",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    // Get the content
    const content = await response.text()

    // Parse the HTML
    const dom = new JSDOM(content, { url })

    // Extract the page title before simplification
    const pageTitle = dom.window.document.title || url

    // Simplify the DOM
    const simplifiedDom = await simplify(dom, url)

    // Minify the HTML using html-minifier-terser
    const html = await minify(simplifiedDom.serialize(), {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: false, // We're removing JS anyway
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      removeAttributeQuotes: true,
      removeEmptyElements: false, // Keep empty elements like <br>
      keepClosingSlash: false,
      caseSensitive: false,
    })

    // Return both the title and the simplified content
    return {
      title: pageTitle,
      content: html,
    }
  } catch (error) {
    console.error("Error in fetchAndSimplify:", error)
    throw error
  }
}
