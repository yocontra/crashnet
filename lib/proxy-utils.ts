import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"

// List of attributes that were introduced after 1995 and should be removed
const modernAttributes = [
  "aria-",
  "data-",
  "role",
  "itemscope",
  "itemtype",
  "itemprop",
  "srcset",
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

// List of allowed HTML tags for vintage browser compatibility
const allowedTags = [
  "a",
  "ol",
  "ul",
  "li",
  "br",
  "p",
  "small",
  "font",
  "b",
  "strong",
  "i",
  "em",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
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

        // For Google specifically
        "X-Client-Data": "CIW2yQEIpLbJAQipncoBCKijygE=",
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

    // Strip tags and only allow specific ones (similar to FrogFind)
    const strippedContent = stripTagsExcept(contentDiv.innerHTML, allowedTags)

    // Replace modern tags with vintage equivalents
    const processedContent = strippedContent
      .replace(/<strong>/g, "<b>")
      .replace(/<\/strong>/g, "</b>")
      .replace(/<em>/g, "<i>")
      .replace(/<\/em>/g, "</i>")

    contentDiv.innerHTML = processedContent
    newDocument.body.appendChild(contentDiv)

    // Process images in the content - redirect through image_proxy
    const images = newDocument.querySelectorAll("img")
    images.forEach((img) => {
      const src = img.getAttribute("src")
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

    // Get the HTML and minify it
    let html = newDom.serialize()
    html = minifyHtml(html)

    return html
  } catch (error) {
    console.error("Error in fetchAndSimplify:", error)
    throw error
  }
}

// Function to strip all HTML tags except those in the allowedTags array
function stripTagsExcept(html: string, allowedTags: string[]): string {
  // Create a regular expression that matches all HTML tags
  const allTagsRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi

  return html.replace(allTagsRegex, (match, tag) => {
    // If the tag is in the allowed list, keep it
    if (allowedTags.includes(tag.toLowerCase())) {
      return match
    }
    // Otherwise, remove it
    return ""
  })
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

// Basic HTML minification function
function minifyHtml(html: string): string {
  return (
    html
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove whitespace between tags
      .replace(/>\s+</g, "><")
      // Remove leading and trailing whitespace
      .replace(/^\s+|\s+$/gm, "")
      // Collapse multiple whitespace
      .replace(/\s{2,}/g, " ")
      // Remove unnecessary whitespace around attributes
      .replace(/\s+=/g, "=")
      .replace(/=\s+/g, "=")
      // Remove optional closing tags for maximum compatibility
      .replace(/<\/option>/g, "")
      .replace(/<\/li>/g, "")
      .replace(/<\/dt>/g, "")
      .replace(/<\/dd>/g, "")
      .replace(/<\/p>/g, "")
      .replace(/<\/td>/g, "")
      .replace(/<\/th>/g, "")
      .replace(/<\/tr>/g, "")
  )
}
