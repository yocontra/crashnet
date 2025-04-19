import { JSDOM } from "jsdom"

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

export async function fetchAndSimplify(url: string): Promise<string> {
  try {
    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Crashnet/1.0 Vintage Computer Proxy",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    // Get the content
    const content = await response.text()

    // Parse the HTML
    const dom = new JSDOM(content)
    const document = dom.window.document

    // Add Crashnet header
    const header = document.createElement("div")
    header.innerHTML = `
      <center>
        <h1>CRASHNET PROXY</h1>
        <p>Viewing: ${url}</p>
        <p><a href="/">Return to Homepage</a></p>
        <hr>
      </center>
    `
    document.body.insertBefore(header, document.body.firstChild)

    // Remove scripts
    const scripts = document.querySelectorAll("script")
    scripts.forEach((script) => script.remove())

    // Remove styles
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
    styles.forEach((style) => style.remove())

    // Remove inline styles
    const elementsWithStyle = document.querySelectorAll("[style]")
    elementsWithStyle.forEach((el) => el.removeAttribute("style"))

    // Remove meta tags (post-1995)
    const metaTags = document.querySelectorAll("meta")
    metaTags.forEach((meta) => meta.remove())

    // Set body attributes for basic styling
    document.body.setAttribute("bgcolor", "white")
    document.body.setAttribute("text", "black")
    document.body.setAttribute("link", "blue")
    document.body.setAttribute("vlink", "purple")

    // Process images - redirect through image_proxy
    const images = document.querySelectorAll("img")
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
    const links = document.querySelectorAll("a")
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

    // Remove iframes
    const iframes = document.querySelectorAll("iframe")
    iframes.forEach((iframe) => iframe.remove())

    // Remove tables for maximum compatibility
    const tables = document.querySelectorAll("table")
    tables.forEach((table) => {
      const div = document.createElement("div")
      div.innerHTML = table.textContent || ""
      table.parentNode?.replaceChild(div, table)
    })

    // Remove modern attributes from all elements
    const allElements = document.querySelectorAll("*")
    allElements.forEach((el) => {
      removeModernAttributes(el)
    })

    // Add footer
    const footer = document.createElement("div")
    footer.innerHTML = `
      <hr>
      <center>
        <p>Rendered by Crashnet - Vintage Computer Proxy</p>
        <p><a href="/">Return to Homepage</a></p>
      </center>
    `
    document.body.appendChild(footer)

    // Get the HTML and minify it
    let html = dom.serialize()
    html = minifyHtml(html)

    return html
  } catch (error) {
    console.error("Error in fetchAndSimplify:", error)
    throw error
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
