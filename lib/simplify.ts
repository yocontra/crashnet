import { JSDOM } from "jsdom"

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

// Main simplify function that applies all the transformation tasks
export async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Clone the DOM to avoid modifying the original
  const clonedDom = new JSDOM(dom.serialize(), { url })

  // Apply each transformation task in sequence
  await addCrashnetHeader(clonedDom, url)
  await replaceModernTags(clonedDom)
  await removeScripts(clonedDom)
  await removeStyles(clonedDom)
  await removeInlineStyles(clonedDom)
  await removeMetaTags(clonedDom)
  await setBodyAttributes(clonedDom)
  await processImages(clonedDom, url)
  await processLinks(clonedDom, url)
  await removeIframes(clonedDom)
  await removeModernAttributesFromAll(clonedDom)

  return clonedDom
}

// Add the Crashnet header to the document
async function addCrashnetHeader(dom: JSDOM, url: string): Promise<void> {
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
}

// Replace modern tags with vintage equivalents
async function replaceModernTags(dom: JSDOM): Promise<void> {
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
}

// Remove scripts from the document
async function removeScripts(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const scripts = document.querySelectorAll("script")
  scripts.forEach((script) => script.remove())
}

// Remove styles from the document
async function removeStyles(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
  styles.forEach((style) => style.remove())
}

// Remove inline styles from all elements
async function removeInlineStyles(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const elementsWithStyle = document.querySelectorAll("[style]")
  elementsWithStyle.forEach((el) => el.removeAttribute("style"))
}

// Remove meta tags from the document
async function removeMetaTags(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const metaTags = document.querySelectorAll("meta")
  metaTags.forEach((meta) => meta.remove())
}

// Set basic styling attributes on the body
async function setBodyAttributes(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  document.body.setAttribute("bgcolor", "white")
  document.body.setAttribute("text", "black")
  document.body.setAttribute("link", "blue")
  document.body.setAttribute("vlink", "purple")
}

// Process images in the document
async function processImages(dom: JSDOM, baseUrl: string): Promise<void> {
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
}

// Process links in the document
async function processLinks(dom: JSDOM, baseUrl: string): Promise<void> {
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
}

// Remove iframes from the document
async function removeIframes(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const iframes = document.querySelectorAll("iframe")
  iframes.forEach((iframe) => iframe.remove())
}

// Remove modern attributes from all elements
async function removeModernAttributesFromAll(dom: JSDOM): Promise<void> {
  const document = dom.window.document
  const allElements = document.querySelectorAll("*")
  allElements.forEach((el) => {
    removeModernAttributesFromElement(el)
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
