import { JSDOM } from 'jsdom'
import { getAbsoluteUrl } from './fetch'
import { getCrashnetHeader } from './header'

// List of attributes that were introduced after 1995 and should be removed
export const MODERN_ATTRIBUTES = [
  // Style and class attributes
  'style',
  'class',

  // Accessibility and data attributes
  'aria-',
  'data-',
  'role',
  'itemscope',
  'itemtype',
  'itemprop',

  // Resource loading attributes
  'integrity',
  'crossorigin',
  'loading',
  'fetchpriority',
  'decoding',
  'rel',
  'async',
  'defer',
  'nomodule',

  // Modern input/editing attributes
  'contenteditable',
  'spellcheck',
  'autocomplete',
  'autocapitalize',
  'autofocus',
  'enterkeyhint',
  'inputmode',

  // Web components
  'is',
  'nonce',
  'part',
  'slot',
  'translate',

  // JavaScript event handlers - comprehensive list
  'onabort',
  'onafterprint',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'onbeforeprint',
  'onbeforeunload',
  'onblur',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'oncontextmenu',
  'oncopy',
  'oncut',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onended',
  'onerror',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'onfullscreenchange',
  'onfullscreenerror',
  'ongotpointercapture',
  'onhashchange',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onlanguagechange',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onlostpointercapture',
  'onmessage',
  'onmessageerror',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onpointercancel',
  'onpointerdown',
  'onpointerenter',
  'onpointerleave',
  'onpointermove',
  'onpointerout',
  'onpointerover',
  'onpointerrawupdate',
  'onpointerup',
  'onpopstate',
  'onprogress',
  'onratechange',
  'onrejectionhandled',
  'onreset',
  'onresize',
  'onscroll',
  'onsearch',
  'onseeked',
  'onseeking',
  'onselect',
  'onselectionchange',
  'onselectstart',
  'onshow',
  'onstalled',
  'onstorage',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'ontouchcancel',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ontransitionend',
  'ontransitionrun',
  'ontransitionstart',
  'onunhandledrejection',
  'onunload',
  'onvolumechange',
  'onwaiting',
  'onwebkitanimationend',
  'onwebkitanimationiteration',
  'onwebkitanimationstart',
  'onwebkittransitionend',
  'onwheel',

  // Modern media and presentation attributes
  'playsinline',
  'autoplay',
  'controls',
  'loop',
  'muted',
  'poster',
  'preload',
  'srcset',
  'sizes',
  'importance',
  'intrinsicsize',
  'referrerpolicy',
  'tabindex',

  // SVG-specific attributes
  'viewbox',
  'preserveaspectratio',
  'xmlns',
  'xmlns:xlink',
  'xlink:href',

  // Obsolete but still modern
  'allowfullscreen',
  'allowpaymentrequest',
  'ping',
  'sandbox',
]

// Process images in the document for proxy
export function processImagesForProxy(dom: JSDOM, baseUrl: string): void {
  const document = dom.window.document

  // First, handle <picture> elements
  processPictureElements(dom, baseUrl)

  // Then process regular images
  const images = document.querySelectorAll('img')

  images.forEach((img) => {
    // Handle srcset attribute if present
    const srcset = img.getAttribute('srcset')
    let src = img.getAttribute('src')

    if (srcset && (!src || src === '')) {
      // Parse srcset and select an appropriate source
      src = selectSourceFromSrcset(srcset)
      img.setAttribute('src', src || '')
    }

    if (src) {
      try {
        // Use the centralized function to get absolute URL
        const absoluteSrc = getAbsoluteUrl(src, baseUrl)
        img.setAttribute('src', `/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)

        // Set max width and height constraints
        constrainImageSize(img)
      } catch (error) {
        console.error(`Error processing image src: ${src}`, error)
      }
    }
  })
}

// Process <picture> elements to select appropriate source
function processPictureElements(dom: JSDOM, baseUrl: string): void {
  const document = dom.window.document
  const pictures = document.querySelectorAll('picture')

  pictures.forEach((picture) => {
    // Find the img element inside the picture
    const img = picture.querySelector('img')
    if (!img) return // Skip if no img found

    // Get all source elements
    const sources = picture.querySelectorAll('source')
    if (sources.length === 0) return // Skip if no sources

    // Try to find a source with media that matches our target width (<=640px)
    let selectedSrc = ''
    let selectedSrcset = ''

    // First, try to find a source with appropriate media query
    for (const source of sources) {
      const media = source.getAttribute('media')
      const srcset = source.getAttribute('srcset')
      const src = source.getAttribute('src')

      // If we have a media attribute targeting mobile/small screens
      if (
        media &&
        (media.includes('max-width') ||
          media.includes('(width <') ||
          media.includes('(width<=') ||
          media.includes('(width <='))
      ) {
        // Use this source if it targets something close to our desired width
        if (srcset) {
          selectedSrcset = srcset
          break
        } else if (src) {
          selectedSrc = src
          break
        }
      }
    }

    // If no appropriate media query was found, take the first source
    if (!selectedSrc && !selectedSrcset) {
      const firstSource = sources[0]
      selectedSrcset = firstSource.getAttribute('srcset') || ''
      selectedSrc = firstSource.getAttribute('src') || ''
    }

    // Process the selected source
    if (selectedSrcset) {
      const bestSrc = selectSourceFromSrcset(selectedSrcset)
      if (bestSrc) {
        const absoluteSrc = getAbsoluteUrl(bestSrc, baseUrl)
        img.setAttribute('src', `/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)
      }
    } else if (selectedSrc) {
      const absoluteSrc = getAbsoluteUrl(selectedSrc, baseUrl)
      img.setAttribute('src', `/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)
    }

    // Set max width constraint
    constrainImageSize(img)

    // Replace the picture element with just the img
    if (picture.parentNode) {
      picture.parentNode.replaceChild(img, picture)
    }
  })
}

// Constrain image size to maximum width of 640px
function constrainImageSize(img: Element): void {
  const MAX_WIDTH = 640

  // Get current width/height attributes
  let width = img.getAttribute('width')
  let height = img.getAttribute('height')

  // If width is specified and exceeds our limit
  if (width && parseInt(width, 10) > MAX_WIDTH) {
    const originalWidth = parseInt(width, 10)
    const originalHeight = height ? parseInt(height, 10) : 0

    // Set constrained width
    img.setAttribute('width', MAX_WIDTH.toString())

    // Adjust height proportionally if available
    if (originalHeight && originalWidth) {
      const scaledHeight = Math.round((originalHeight * MAX_WIDTH) / originalWidth)
      img.setAttribute('height', scaledHeight.toString())
    }
  }

  // If no width is specified, set a maximum width
  if (!width) {
    img.setAttribute('width', MAX_WIDTH.toString())
  }
}

// Function to select an appropriate source from srcset
export function selectSourceFromSrcset(srcset: string): string {
  try {
    // Split the srcset into individual sources
    const sources = srcset.split(',').map((src) => src.trim())

    // Target width for vintage computers (aim for medium-sized images)
    const targetWidth = 640

    // Parse each source and extract URL and descriptor
    const parsedSources = sources.map((source) => {
      const [url, descriptor] = source.split(/\s+/)
      let width = 0

      // Parse width descriptor (e.g., "800w")
      if (descriptor && descriptor.endsWith('w')) {
        width = Number.parseInt(descriptor.slice(0, -1), 10)
      }
      // Parse density descriptor (e.g., "2x")
      else if (descriptor && descriptor.endsWith('x')) {
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
    return parsedSources.length > 0 ? parsedSources[0].url : ''
  } catch (error) {
    console.error('Error parsing srcset:', error)
    // If there's an error, try to extract the first URL
    const firstSource = srcset.split(',')[0]
    if (firstSource) {
      const url = firstSource.split(/\s+/)[0]
      return url || ''
    }
    return ''
  }
}

// Process links in the document for proxy
export function processLinksForProxy(dom: JSDOM, baseUrl: string, isReadMode = false): void {
  const document = dom.window.document

  // Process anchor links
  const links = document.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        // Use the centralized function to get absolute URL
        const absoluteHref = getAbsoluteUrl(href, baseUrl)

        // Add read parameter if in reading mode
        const readParam = isReadMode ? '&read=true' : ''
        link.setAttribute('href', `/proxy?url=${encodeURIComponent(absoluteHref)}${readParam}`)
      } catch (error) {
        console.error(`Error processing link: ${href}`, error)
      }
    }
  })

  // Process form actions
  const forms = document.querySelectorAll('form')
  forms.forEach((form) => {
    const action = form.getAttribute('action')
    if (action) {
      try {
        // Skip forms that already point to our proxy
        if (action.startsWith('/proxy') || action === '/') {
          return
        }

        // Use the centralized function to get absolute URL
        const absoluteAction = getAbsoluteUrl(action, baseUrl)

        // Set action to our proxy endpoint
        form.setAttribute('action', '/proxy')

        // Add a hidden field with the original form action
        const hiddenField = document.createElement('input')
        hiddenField.setAttribute('type', 'hidden')
        hiddenField.setAttribute('name', 'x-form-action')
        hiddenField.setAttribute('value', encodeURIComponent(absoluteAction))
        form.appendChild(hiddenField)

        // Ensure method is POST for external form submissions
        form.setAttribute('method', 'post')
      } catch (error) {
        console.error(`Error processing form action: ${action}`, error)
      }
    }
  })
}

// Process images with vintage browser friendly attributes
export function processImagesVintage(dom: JSDOM, baseUrl: string): void {
  // First use the shared function to handle URLs properly
  processImagesForProxy(dom, baseUrl)

  const document = dom.window.document
  const images = document.querySelectorAll('img')

  images.forEach((img) => {
    // Remove modern attributes
    removeModernAttributesFromElement(img)

    // Keep only essential attributes
    const src = img.getAttribute('src')
    const alt = img.getAttribute('alt')
    const width = img.getAttribute('width')
    const height = img.getAttribute('height')
    const border = img.getAttribute('border')

    // Clear all attributes
    while (img.attributes.length > 0) {
      img.removeAttribute(img.attributes[0].name)
    }

    // Add back only essential attributes
    if (src) img.setAttribute('src', src)
    if (alt) img.setAttribute('alt', alt)

    // Add constrained width and height
    const MAX_WIDTH = 640

    if (width) {
      const originalWidth = parseInt(width, 10)
      // If width exceeds the max, scale it down
      if (originalWidth > MAX_WIDTH) {
        img.setAttribute('width', MAX_WIDTH.toString())

        // Scale height proportionally if available
        if (height) {
          const originalHeight = parseInt(height, 10)
          const scaledHeight = Math.round((originalHeight * MAX_WIDTH) / originalWidth)
          img.setAttribute('height', scaledHeight.toString())
        }
      } else {
        // Use original dimensions if they're below the max
        img.setAttribute('width', width)
        if (height) img.setAttribute('height', height)
      }
    } else {
      // If no width specified, apply a default max width
      img.setAttribute('width', MAX_WIDTH.toString())
      if (height) img.setAttribute('height', height)
    }

    if (border) img.setAttribute('border', border)
  })
}

// Add the Crashnet header to the document
export function addCrashnetHeader(dom: JSDOM, url: string): void {
  const document = dom.window.document
  const header = document.createElement('div')
  header.innerHTML = getCrashnetHeader(url, false)
  document.body.insertBefore(header, document.body.firstChild)
}

// Replace modern tags with vintage equivalents
export function replaceModernTags(dom: JSDOM): void {
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
        if (el.tagName.toLowerCase() === 'strong') {
          const b = document.createElement('b')
          while (el.firstChild) {
            b.appendChild(el.firstChild)
          }
          el.parentNode?.replaceChild(b, el)
        } else if (el.tagName.toLowerCase() === 'em') {
          const i = document.createElement('i')
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
export function removeScripts(dom: JSDOM): void {
  const document = dom.window.document
  const scripts = document.querySelectorAll('script, noscript')
  scripts.forEach((script) => script.remove())
}

// Remove styles from the document
export function removeStyles(dom: JSDOM): void {
  const document = dom.window.document
  const styles = document.querySelectorAll('style, link')
  styles.forEach((style) => style.remove())
}

// Remove meta tags from the document
export function removeMetaTags(dom: JSDOM): void {
  const document = dom.window.document
  const metaTags = document.querySelectorAll('meta')
  metaTags.forEach((meta) => meta.remove())
}

// Set basic styling attributes on the body
export function setBodyAttributes(dom: JSDOM): void {
  const document = dom.window.document
  document.body.setAttribute('bgcolor', 'white')
  document.body.setAttribute('text', 'black')
  document.body.setAttribute('link', 'blue')
  document.body.setAttribute('vlink', 'purple')
}

// Remove iframes from the document
export function removeIframes(dom: JSDOM): void {
  const document = dom.window.document
  const iframes = document.querySelectorAll('iframe')
  iframes.forEach((iframe) => iframe.remove())
}

// Remove SVGs from the document
export function handleSVGs(dom: JSDOM): void {
  const document = dom.window.document
  const svgs = document.querySelectorAll('svg')
  svgs.forEach((svg) => {
    // Get dimensions
    const width = svg.getAttribute('width') || '100'
    const height = svg.getAttribute('height') || '100'

    // Create a black div as placeholder
    const placeholder = document.createElement('img')
    placeholder.setAttribute('bgcolor', 'black')
    placeholder.setAttribute('width', width)
    placeholder.setAttribute('height', height)
    placeholder.setAttribute('title', 'SVG Image (not supported)')

    // Replace the SVG with the placeholder
    svg.parentNode?.replaceChild(placeholder, svg)
  })
}

// Replace video tags with black background divs
export function handleVideoTags(dom: JSDOM): void {
  const document = dom.window.document
  const videos = document.querySelectorAll('video')

  videos.forEach((video) => {
    // Get dimensions from the video element
    const width = video.getAttribute('width') || '320'
    const height = video.getAttribute('height') || '240'

    // Create a black div as placeholder
    const placeholder = document.createElement('div')
    placeholder.setAttribute('bgcolor', 'black')
    placeholder.setAttribute('width', width)
    placeholder.setAttribute('height', height)
    placeholder.innerHTML = `
      <table width="100%" height="100%" bgcolor="black">
        <tr>
          <td align="center" valign="middle">
            <font color="white">Video is not supported</font>
          </td>
        </tr>
      </table>
    `

    // Replace the video with the placeholder
    video.parentNode?.replaceChild(placeholder, video)
  })
}

// Replace audio tags with download links
export function handleAudioTags(dom: JSDOM, baseUrl: string): void {
  const document = dom.window.document
  const audios = document.querySelectorAll('audio')

  audios.forEach((audio) => {
    // Find the source elements or src attribute
    const sources = audio.querySelectorAll('source')
    let audioSrc = ''

    if (sources.length > 0) {
      // Get the first source element's src
      audioSrc = sources[0].getAttribute('src') || ''
    } else {
      // Get the audio element's src
      audioSrc = audio.getAttribute('src') || ''
    }

    if (audioSrc) {
      try {
        // Convert to absolute URL
        const absoluteSrc = getAbsoluteUrl(audioSrc, baseUrl)

        // Create a download link
        const downloadLink = document.createElement('a')
        downloadLink.setAttribute('href', absoluteSrc)
        downloadLink.innerHTML = 'Download Audio'

        // Replace the audio element with the download link
        audio.parentNode?.replaceChild(downloadLink, audio)
      } catch (error) {
        console.error(`Error processing audio src: ${audioSrc}`, error)

        // Create a plain text replacement if URL is invalid
        const errorText = document.createTextNode('Audio not available')
        audio.parentNode?.replaceChild(errorText, audio)
      }
    } else {
      // No source found, just remove the audio element
      audio.remove()
    }
  })
}

// Function to remove modern attributes from an element
export function removeModernAttributesFromElement(element: Element): void {
  // Get all attributes
  const attributes = Array.from(element.attributes)

  // Check each attribute against the list of modern attributes
  attributes.forEach((attr) => {
    const name = attr.name.toLowerCase()

    // Check if the attribute name starts with any of the modern attribute prefixes
    if (MODERN_ATTRIBUTES.some((prefix) => name.startsWith(prefix))) {
      element.removeAttribute(attr.name)
    }
  })
}

// Remove modern attributes from all elements
export function removeModernAttributesFromAll(dom: JSDOM): void {
  const document = dom.window.document
  const allElements = document.querySelectorAll('*')
  allElements.forEach((el) => {
    removeModernAttributesFromElement(el)
  })
}
