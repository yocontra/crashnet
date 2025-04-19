import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import { minify } from "html-minifier-terser"

// List of attributes that were introduced after 1995 and should be removed
const modernAttributes = [
  "aria-",
  "data-",
  "role",
  "itemscope",
  "itemtype",
  "itemprop",
  "integrity",
  "crossorigin",
  "loading",
  "fetchpriority",
  "decoding",
  "rel",
  "async",
  "defer",
  "nomodule",
  "contenteditable",
  "spellcheck",
  "autocomplete",
  "autocapitalize",
  "autofocus",
  "enterkeyhint",
  "inputmode",
  "is",
  "nonce",
  "part",
  "slot",
  "translate",
]

export async function fetchAndSimplify(url: string): Promise<string> {
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
    const document = dom.window.document

    // Extract the page title
    const pageTitle = document.title || url

    // Use Readability to extract the main content
    const reader = new Readability(document)
    const article = reader.parse()

    if (!article) {
      throw new Error("Could not parse article content")
    }

    // Create a new document with just the readable content
    const newDom = new JSDOM(`<!DOCTYPE html><html><head><title>${pageTitle}</title></head><body></body></html>`)
    const newDocument = newDom.window.document

    // Add Crashnet minimal header
    const header = newDocument.createElement("div")
    header.innerHTML = `
      <table width="100%" bgcolor="white" cellpadding="0" cellspacing="0" border="0">
        <tr height="32">
          <td width="150" align="left" valign="middle">
            <form action="/" method="get">
              <input type="submit" value="Back to CrashNet">
            </form>
          </td>
          <td align="center" valign="middle">
            <form action="/proxy" method="get" width="100%">
              <input type="text" name="url" value="${url}" size="40">
              <input type="submit" value="Go">
            </form>
          </td>
        </tr>
      </table>
      <hr>
      <h1>${pageTitle}</h1>
    `
    newDocument.body.appendChild(header)

    // Create a content div
    const contentDiv = newDocument.createElement("div")

    // Use the article content from Readability
    contentDiv.innerHTML = article.content

    // Replace modern tags with vintage equivalents
    const contentHtml = contentDiv.innerHTML
      .replace(/<strong>/g, "<b>")
      .replace(/<\/strong>/g, "</b>")
      .replace(/<em>/g, "<i>")
      .replace(/<\/em>/g, "</i>")

    contentDiv.innerHTML = contentHtml
    newDocument.body.appendChild(contentDiv)

    // Remove scripts
    const scripts = newDocument.querySelectorAll("script")
    scripts.forEach((script) => script.remove())

    // Remove styles
    const styles = newDocument.querySelectorAll('style, link[rel="stylesheet"]')
    styles.forEach((style) => style.remove())

    // Remove inline styles
    const elementsWithStyle = newDocument.querySelectorAll("[style]")
    elementsWithStyle.forEach((el) => el.removeAttribute("style"))

    // Process images in the content - redirect through image_proxy
    const images = newDocument.querySelectorAll("img")
    images.forEach((img) => {
      // Handle srcset attribute if present
      const srcset = img.getAttribute("srcset")
      let src = img.getAttribute("src")

      if (srcset && (!src || src === "")) {
        // Parse srcset and select an appropriate source
        src = selectSourceFromSrcset(srcset)
        img.setAttribute("src", src)
      }

      if (src) {
        // Handle relative URLs
        const absoluteSrc = new URL(src, url).toString()
        img.setAttribute("src", `/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)
      }

      // Remove modern attributes
      removeModernAttributes(img)

      // Keep only essential attributes
      const alt = img.getAttribute("alt")
      const width = img.getAttribute("width")
      const height = img.getAttribute("height")
      const border = img.getAttribute("border")

      // Clear all attributes
      while (img.attributes.length > 0) {
        img.removeAttribute(img.attributes[0].name)
      }

      // Add back only essential attributes
      if (src) img.setAttribute("src", `/image_proxy?url=${encodeURIComponent(new URL(src, url).toString())}`)
      if (alt) img.setAttribute("alt", alt)
      if (width) img.setAttribute("width", width)
      if (height) img.setAttribute("height", height)
      if (border) img.setAttribute("border", border)
    })

    // Process links - redirect through proxy
    const links = newDocument.querySelectorAll("a")
    links.forEach((link) => {
      const href = link.getAttribute("href")
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        // Handle relative URLs
        const absoluteHref = new URL(href, url).toString()
        link.setAttribute("href", `/proxy?url=${encodeURIComponent(absoluteHref)}`)
      }

      // Remove modern attributes
      removeModernAttributes(link)
    })

    // Set body attributes for basic styling
    newDocument.body.setAttribute("bgcolor", "white")
    newDocument.body.setAttribute("text", "black")
    newDocument.body.setAttribute("link", "blue")
    newDocument.body.setAttribute("vlink", "purple")

    // Remove modern attributes from all elements
    const allElements = newDocument.querySelectorAll("*")
    allElements.forEach((el) => {
      removeModernAttributes(el)
    })

    // Get the HTML
    let html = newDom.serialize()

    // Minify the HTML using html-minifier-terser
    html = await minify(html, {
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

    return html
  } catch (error) {
    console.error("Error in fetchAndSimplify:", error)
    throw error
  }
}

// Function to select an appropriate source from srcset
function selectSourceFromSrcset(srcset: string): string {
  try {
    // Split the srcset into individual sources
    const sources = srcset.split(",").map((src) => src.trim())

    // Target width for vintage computers (aim for medium-sized images)
    const targetWidth = 640

    // Parse each source and extract URL and descriptor
    const parsedSources = sources.map((source) => {
      const [url, descriptor] = source.split(/\s+/)
      let width = 0

      // Parse width descriptor (e.g., "800w")
      if (descriptor && descriptor.endsWith("w")) {
        width = Number.parseInt(descriptor.slice(0, -1), 10)
      }
      // Parse density descriptor (e.g., "2x")
      else if (descriptor && descriptor.endsWith("x")) {
        const density = Number.parseFloat(descriptor.slice(0, -1))
        width = targetWidth * density
      }
      // No descriptor, assume default width
      else {
        width = targetWidth
      }

      return { url, width }
    })

    // Sort by how close the width is to our target
    parsedSources.sort((a, b) => {
      return Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth)
    })

    // Return the URL of the best match, or the first source if no match
    return parsedSources.length > 0 ? parsedSources[0].url : ""
  } catch (error) {
    console.error("Error parsing srcset:", error)
    // If there's an error, try to extract the first URL
    const firstSource = srcset.split(",")[0]
    if (firstSource) {
      const url = firstSource.split(/\s+/)[0]
      return url || ""
    }
    return ""
  }
}

// Function to remove modern attributes from an element
function removeModernAttributes(element: Element): void {
  // Get all attributes
  const attributes = Array.from(element.attributes)

  // Check each attribute against the list of modern attributes
  attributes.forEach((attr) => {
    const name = attr.name.toLowerCase()

    // Check if the attribute name starts with any of the modern attribute prefixes
    if (modernAttributes.some((prefix) => name.startsWith(prefix))) {
      element.removeAttribute(attr.name)
    }
  })
}
