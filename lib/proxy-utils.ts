import { JSDOM } from "jsdom"
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

    return html
  } catch (error) {
    console.error("Error in fetchAndSimplify:", error)
    throw error
  }
}

// Main simplify function that chains all the transformation tasks
async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Clone the DOM to avoid modifying the original
  const clonedDom = new JSDOM(dom.serialize(), { url })

  // Apply each transformation task in sequence
  return addCrashnetHeader(clonedDom, url)
    .then((dom) => replaceModernTags(dom))
    .then((dom) => removeScripts(dom))
    .then((dom) => removeStyles(dom))
    .then((dom) => removeInlineStyles(dom))
    .then((dom) => removeMetaTags(dom))
    .then((dom) => setBodyAttributes(dom))
    .then((dom) => processImages(dom, url))
    .then((dom) => processLinks(dom, url))
    .then((dom) => removeIframes(dom))
    .then((dom) => removeModernAttributesFromAll(dom))
}

// Add the Crashnet header to the document
function addCrashnetHeader(dom: JSDOM, url: string): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const header = document.createElement("div")
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
    `
    document.body.insertBefore(header, document.body.firstChild)
    resolve(dom)
  })
}

// Replace modern tags with vintage equivalents
function replaceModernTags(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document

    function replaceTagsInElement(element: Element): void {
      // Get all child nodes
      const childNodes = element.childNodes

      // Process each child node
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i]

        // If it's an element node
        if (node.nodeType === 1) {
          const el = node as Element

          // Replace specific tags
          if (el.tagName.toLowerCase() === "strong") {
            const b = document.createElement("b")
            while (el.firstChild) {
              b.appendChild(el.firstChild)
            }
            el.parentNode?.replaceChild(b, el)
          } else if (el.tagName.toLowerCase() === "em") {
            const i = document.createElement("i")
            while (el.firstChild) {
              i.appendChild(el.firstChild)
            }
            el.parentNode?.replaceChild(i, el)
          } else {
            // Recursively process child elements
            replaceTagsInElement(el)
          }
        }
      }
    }

    replaceTagsInElement(document.body)
    resolve(dom)
  })
}

// Remove scripts from the document
function removeScripts(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const scripts = document.querySelectorAll("script")
    scripts.forEach((script) => script.remove())
    resolve(dom)
  })
}

// Remove styles from the document
function removeStyles(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
    styles.forEach((style) => style.remove())
    resolve(dom)
  })
}

// Remove inline styles from all elements
function removeInlineStyles(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const elementsWithStyle = document.querySelectorAll("[style]")
    elementsWithStyle.forEach((el) => el.removeAttribute("style"))
    resolve(dom)
  })
}

// Remove meta tags from the document
function removeMetaTags(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const metaTags = document.querySelectorAll("meta")
    metaTags.forEach((meta) => meta.remove())
    resolve(dom)
  })
}

// Set basic styling attributes on the body
function setBodyAttributes(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    document.body.setAttribute("bgcolor", "white")
    document.body.setAttribute("text", "black")
    document.body.setAttribute("link", "blue")
    document.body.setAttribute("vlink", "purple")
    resolve(dom)
  })
}

// Process images in the document
function processImages(dom: JSDOM, baseUrl: string): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const images = document.querySelectorAll("img")

    images.forEach((img) => {
      // Handle srcset attribute if present
      const srcset = img.getAttribute("srcset")
      let src = img.getAttribute("src")

      if (srcset && (!src || src === "")) {
        // Parse srcset and select an appropriate source
        src = selectSourceFromSrcset(srcset)
        img.setAttribute("src", src || "")
      }

      if (src) {
        try {
          // Handle relative URLs
          const absoluteSrc = new URL(src, baseUrl).toString()
          img.setAttribute("src", `/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)
        } catch (error) {
          console.error(`Error processing image src: ${src}`, error)
        }
      }

      // Remove modern attributes
      removeModernAttributesFromElement(img)

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
      if (src) {
        try {
          img.setAttribute("src", `/image_proxy?url=${encodeURIComponent(new URL(src, baseUrl).toString())}`)
        } catch (error) {
          console.error(`Error setting image src: ${src}`, error)
        }
      }
      if (alt) img.setAttribute("alt", alt)
      if (width) img.setAttribute("width", width)
      if (height) img.setAttribute("height", height)
      if (border) img.setAttribute("border", border)
    })

    resolve(dom)
  })
}

// Process links in the document
function processLinks(dom: JSDOM, baseUrl: string): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const links = document.querySelectorAll("a")

    links.forEach((link) => {
      const href = link.getAttribute("href")
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        try {
          // Handle relative URLs
          const absoluteHref = new URL(href, baseUrl).toString()
          link.setAttribute("href", `/proxy?url=${encodeURIComponent(absoluteHref)}`)
        } catch (error) {
          console.error(`Error processing link: ${href}`, error)
        }
      }

      // Remove modern attributes
      removeModernAttributesFromElement(link)
    })

    resolve(dom)
  })
}

// Remove iframes from the document
function removeIframes(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const iframes = document.querySelectorAll("iframe")
    iframes.forEach((iframe) => iframe.remove())
    resolve(dom)
  })
}

// Remove modern attributes from all elements
function removeModernAttributesFromAll(dom: JSDOM): Promise<JSDOM> {
  return new Promise((resolve) => {
    const document = dom.window.document
    const allElements = document.querySelectorAll("*")
    allElements.forEach((el) => {
      removeModernAttributesFromElement(el)
    })
    resolve(dom)
  })
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
function removeModernAttributesFromElement(element: Element): void {
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
