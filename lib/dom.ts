import { JSDOM } from 'jsdom'
import { getAbsoluteUrl, getAppUrl } from './fetch'
import { getCrashnetHeader } from './header'
import { TARGET_WIDTH, VIEWPORT_WIDTH } from './config'
import parseSrcset from 'srcset-parse'

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
  'accesskey',

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

// List of HTML tags that were introduced after 1995 and should be removed
export const MODERN_TAGS = [
  // HTML5 semantic tags
  /*
  'article',
  'aside',
  'details',
  'figcaption',
  'figure',
  'footer',
  'header',
  'main',
  'mark',
  'nav',
  'section',
  'summary',
  'time',
  */

  // Media tags
  'audio',
  'canvas',
  'source',
  'track',
  'video',

  // Form tags introduced after HTML 3.2
  'datalist',
  'output',
  'progress',
  'meter',

  // Embedded content
  'embed',
  'iframe',
  'object',
  'param',

  // Other HTML5 elements
  'dialog',
  'menu',
  'menuitem',
  'template',
  'picture',
  'portal',
  'slot',
  'svg',

  // Style and script
  'style',
  'noscript',

  // Meta information
  'meta',
  'link',
]

// Process images in the document - handles proxying and size constraints
export function handleImages(dom: JSDOM, baseUrl: string, isReadMode: boolean = false): void {
  const document = dom.window.document
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
        const absoluteSrc = getAbsoluteUrl(src, baseUrl)
        const proxyUrl = getAppUrl(`/image_proxy?url=${encodeURIComponent(absoluteSrc)}`)
        img.setAttribute('src', proxyUrl)

        // Set max width and height constraints
        constrainImageSize(img)
      } catch (error) {
        console.error(`Error processing image src: ${src}`, error)
      }
    }

    // Apply additional processing for web mode (non-read mode)
    // In read mode, we keep more modern attributes for better reading experience
    if (!isReadMode) {
      // Keep only essential attributes
      const src = img.getAttribute('src')
      const alt = img.getAttribute('alt')

      // Get dimensions from computed style if not in attributes
      let width = img.getAttribute('width')
      let height = img.getAttribute('height')

      // If no width/height attributes, try to get from computed style
      if (!width || !height) {
        const computedStyle = dom.window.getComputedStyle(img)
        if (!width && computedStyle.width) {
          width = computedStyle.width.replace('px', '')
        }
        if (!height && computedStyle.height) {
          height = computedStyle.height.replace('px', '')
        }
      }

      const border = img.getAttribute('border')

      // Clear all attributes
      while (img.attributes.length > 0) {
        img.removeAttribute(img.attributes[0].name)
      }

      // Add back only essential attributes
      if (src) img.setAttribute('src', src)
      if (alt) img.setAttribute('alt', alt)
      if (width) img.setAttribute('width', width)
      if (height) img.setAttribute('height', height)
      if (border) img.setAttribute('border', border)
    }
  })
}

// Constrain image size to maximum width from config
function constrainImageSize(img: Element): void {
  const MAX_WIDTH = TARGET_WIDTH

  // Get current width/height attributes or computed style
  let width = img.getAttribute('width')
  let height = img.getAttribute('height')

  // If no width/height attributes, try to get from computed style
  if (!width || !height) {
    const computedStyle = img.ownerDocument.defaultView?.getComputedStyle(img)
    if (computedStyle) {
      if (!width && computedStyle.width) {
        width = computedStyle.width.replace('px', '')
      }
      if (!height && computedStyle.height) {
        height = computedStyle.height.replace('px', '')
      }
    }
  }

  // If width is specified and exceeds our limit
  if (width && parseInt(width, 10) > MAX_WIDTH) {
    const originalWidth = parseInt(width, 10)
    const originalHeight = height ? parseInt(height, 10) : 0

    // Set constrained width
    img.setAttribute('width', MAX_WIDTH.toString())

    // Adjust height proportionally if available
    if (originalHeight != null && originalWidth != null) {
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
    // Use the srcset-parse library to correctly handle the srcset attribute
    const sources = parseSrcset(srcset)

    if (!sources || sources.length === 0) {
      return ''
    }

    // Target width for vintage computers
    const targetWidth = VIEWPORT_WIDTH

    // Process sources to calculate effective width for comparison
    const processedSources = sources.map((source) => {
      let width = 0

      // Handle sources with width descriptor
      if (source.width) {
        width = source.width
      }
      // Handle sources with density descriptor (e.g. 2x)
      else if (source.density) {
        width = targetWidth * source.density
      }
      // Default to target width if no descriptor
      else {
        width = targetWidth
      }

      return {
        url: source.url,
        width,
      }
    })

    // Sort by how close the width is to our target
    processedSources.sort((a, b) => {
      return Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth)
    })

    // Return the URL of the best match
    return processedSources[0].url
  } catch (error) {
    console.error('Error parsing srcset:', error)

    // Simply try to get the first part of the string that looks like a URL
    try {
      // Look for the first string that looks like a URL
      const urlMatch = srcset.match(/https?:\/\/[^\s,]+|data:[^\s,]+/i)
      if (urlMatch) {
        return urlMatch[0]
      }
    } catch (nestedError) {
      console.error('Fallback srcset parsing also failed:', nestedError)
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
        const readParam = isReadMode ? 'read=true&' : ''
        const proxyUrl = getAppUrl(`/proxy?${readParam}url=${encodeURIComponent(absoluteHref)}`)
        link.setAttribute('href', proxyUrl)
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
        const appBaseUrl = new URL(getAppUrl('/')).origin
        if (
          action.startsWith('/proxy') ||
          action === '/' ||
          action.startsWith(`${appBaseUrl}/proxy`)
        ) {
          return
        }

        // Use the centralized function to get absolute URL
        const absoluteAction = getAbsoluteUrl(action, baseUrl)

        // Set action to our proxy endpoint
        const proxyUrl = getAppUrl('/proxy')
        form.setAttribute('action', proxyUrl)

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

  // First, process <picture> elements before any other transformations
  processPictureElements(dom)

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

function processPictureElements(dom: JSDOM): void {
  const document = dom.window.document
  const pictures = document.querySelectorAll('picture')

  pictures.forEach((picture) => {
    const img = picture.querySelector('img')
    if (!img) return

    const sources = picture.querySelectorAll('source')
    if (sources.length === 0) return

    let selectedSrc = ''
    let selectedSrcset = ''

    for (const source of sources) {
      const media = source.getAttribute('media')
      const srcset = source.getAttribute('srcset')
      const src = source.getAttribute('src')

      if (
        media &&
        (media.includes('max-width') ||
          media.includes('(width <') ||
          media.includes('(width<=') ||
          media.includes('(width <='))
      ) {
        if (srcset) {
          selectedSrcset = srcset
          break
        } else if (src) {
          selectedSrc = src
          break
        }
      }
    }

    if (!selectedSrc && !selectedSrcset) {
      const firstSource = sources[0]
      selectedSrcset = firstSource.getAttribute('srcset') || ''
      selectedSrc = firstSource.getAttribute('src') || ''
    }

    if (selectedSrcset) {
      const bestSrc = selectSourceFromSrcset(selectedSrcset)
      if (bestSrc) {
        img.setAttribute('src', bestSrc)
      }
    } else if (selectedSrc) {
      img.setAttribute('src', selectedSrc)
    }

    if (picture.parentNode) {
      picture.parentNode.replaceChild(img, picture)
    }
  })
}

// Remove all modern tags from the document (consolidated function)
export function removeModernTags(dom: JSDOM): void {
  const document = dom.window.document

  // Create a selector from the MODERN_TAGS array
  const selector = MODERN_TAGS.join(', ')

  // Find all modern elements
  const modernElements = document.querySelectorAll(selector)

  // Remove each element
  modernElements.forEach((element) => element.remove())
}

// Set basic styling attributes on the body
export function setBodyAttributes(dom: JSDOM): void {
  const document = dom.window.document
  document.body.setAttribute('bgcolor', 'white')
  document.body.setAttribute('text', 'black')
  document.body.setAttribute('link', 'blue')
  document.body.setAttribute('vlink', 'purple')
}

// Remove elements with role="dialog"
export function removeUselessRoles(dom: JSDOM): void {
  const document = dom.window.document
  const dialogElements = document.querySelectorAll('[role="dialog"]')
  dialogElements.forEach((element) => element.remove())
}

// Process SVGs and convert them to images using the image proxy
export function handleSVGs(dom: JSDOM): void {
  const document = dom.window.document
  const svgs = document.querySelectorAll('svg')
  svgs.forEach((svg) => {
    // Get dimensions from computed style
    const computedStyle = dom.window.getComputedStyle(svg)
    let width = computedStyle.width || svg.getAttribute('width') || '100'
    let height = computedStyle.height || svg.getAttribute('height') || '100'

    // Remove 'px' if present
    width = width.replace('px', '')
    height = height.replace('px', '')

    // Create serialized SVG string for the placeholder image
    const serializer = new dom.window.XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgURL = 'data:image/svg+xml;base64,' + btoa(svgString)

    // Create an img tag as replacement
    const imgElement = document.createElement('img')
    imgElement.setAttribute('width', width)
    imgElement.setAttribute('height', height)

    try {
      // Create proxy URL for the SVG
      const proxyUrl = getAppUrl(`/image_proxy?url=${encodeURIComponent(svgURL)}`)
      imgElement.setAttribute('src', proxyUrl)
      imgElement.setAttribute('alt', 'SVG Image')

      // Apply size constraints to ensure rendering compatibility
      constrainImageSize(imgElement)
    } catch (error) {
      console.error('Error creating proxy URL for SVG:', error)
      // Fallback for error cases
      imgElement.setAttribute('alt', 'SVG Image (conversion failed)')
    }

    // Replace the SVG with the img element
    svg.parentNode?.replaceChild(imgElement, svg)
  })
}

// Replace video tags with black background divs
export function handleVideoTags(dom: JSDOM): void {
  const document = dom.window.document
  const videos = document.querySelectorAll('video')

  videos.forEach((video) => {
    // Get dimensions from computed style or attributes
    const computedStyle = dom.window.getComputedStyle(video)
    let width = computedStyle.width || video.getAttribute('width') || '320'
    let height = computedStyle.height || video.getAttribute('height') || '240'

    // Remove 'px' if present
    width = width.replace('px', '')
    height = height.replace('px', '')

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

// Remove elements with display:none based on computed style
export function removeHiddenElements(dom: JSDOM): void {
  const document = dom.window.document
  const elements = document.querySelectorAll('*')

  elements.forEach((element) => {
    const computedStyle = dom.window.getComputedStyle(element)
    if (computedStyle?.display === 'none' || computedStyle?.visibility === 'hidden') {
      element.remove()
    }
  })
}

// Preserve computed styles as DOM attributes before stripping CSS
export function preserveComputed(dom: JSDOM): void {
  const document = dom.window.document
  const elements = document.querySelectorAll('*')

  elements.forEach((element) => {
    const computedStyle = dom.window.getComputedStyle(element)
    const tagName = element.tagName.toLowerCase()

    // Preserve text color - convert to hex or named color for older browsers
    if (computedStyle.color) {
      const color = rgbToHexOrName(computedStyle.color)
      element.setAttribute('text', color)
    }

    // Preserve display property for later tag conversion
    if (computedStyle.display) {
      const display = computedStyle.display
      if (display) {
        element.setAttribute('data-display', display)
      }
    }

    // Preserve background color
    if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const bgcolor = rgbToHexOrName(computedStyle.backgroundColor)
      element.setAttribute('bgcolor', bgcolor)
    }

    // Preserve border styling - more comprehensive approach
    // Check if any border is set
    const hasBorder = [
      computedStyle.borderTopWidth,
      computedStyle.borderRightWidth,
      computedStyle.borderBottomWidth,
      computedStyle.borderLeftWidth,
    ].some((width) => width && width !== '0px')

    if (hasBorder) {
      // Get border width (use the largest if they differ)
      const borderWidths = [
        parseInt(computedStyle.borderTopWidth, 10) || 0,
        parseInt(computedStyle.borderRightWidth, 10) || 0,
        parseInt(computedStyle.borderBottomWidth, 10) || 0,
        parseInt(computedStyle.borderLeftWidth, 10) || 0,
      ]
      const maxBorderWidth = Math.max(...borderWidths)

      // Set border attribute (works on tables, images, etc.)
      element.setAttribute('border', maxBorderWidth.toString())

      // For tables, handle additional border attributes
      if (tagName === 'table') {
        // Border color
        if (computedStyle.borderColor) {
          const borderColor = rgbToHexOrName(computedStyle.borderColor)
          element.setAttribute('bordercolor', borderColor)
        }

        // Handle cellspacing/cellpadding based on border-collapse and padding
        if (computedStyle.borderCollapse === 'separate') {
          const cellspacing = parseInt(computedStyle.borderSpacing, 10) || 2
          element.setAttribute('cellspacing', cellspacing.toString())
        } else {
          element.setAttribute('cellspacing', '0')
        }

        // Try to approximate cellpadding from TD padding if available
        const tdPadding = parseInt(computedStyle.padding, 10) || 1
        element.setAttribute('cellpadding', tdPadding.toString())
      }
    }

    // Preserve font styling - handle weight, style, and decoration
    // Font family
    if (computedStyle.fontFamily) {
      const fontFamily = computedStyle.fontFamily.split(',')[0].trim().replace(/["']/g, '')
      element.setAttribute('face', fontFamily)
    }

    // Font size as legacy size attribute (1-7)
    if (computedStyle.fontSize) {
      const size = convertFontSizeToLegacy(computedStyle.fontSize)
      if (size) {
        element.setAttribute('size', size)
      }
    }

    // Handle font weight using b tag
    if (computedStyle.fontWeight && parseInt(computedStyle.fontWeight, 10) >= 600) {
      if (tagName !== 'b' && tagName !== 'strong') {
        // Can't modify the DOM tree here, so we'll use a marker attribute
        element.setAttribute('fontweight', 'bold')
      }
    }

    // Handle font style using i tag
    if (computedStyle.fontStyle === 'italic' || computedStyle.fontStyle === 'oblique') {
      if (tagName !== 'i' && tagName !== 'em') {
        element.setAttribute('fontstyle', 'italic')
      }
    }

    // Handle text decoration
    if (computedStyle.textDecoration.includes('underline')) {
      if (tagName !== 'u') {
        element.setAttribute('textstyle', 'underline')
      }
    }
  })

  // Process for wrapping elements with styling markers in appropriate HTML tags
  processComputedStyleTags(dom)
}

// Process elements with special style markers and wrap them in appropriate vintage HTML tags
function processComputedStyleTags(dom: JSDOM): void {
  const document = dom.window.document

  // Helper function to convert element tag
  function convertElementTag(element: Element, newTagName: string): void {
    try {
      // Create new element with desired tag name
      const newElement = document.createElement(newTagName)

      // Copy all attributes
      Array.from(element.attributes).forEach((attr) => {
        newElement.setAttribute(attr.name, attr.value)
      })

      // Move all children to the new element
      while (element.firstChild) {
        newElement.appendChild(element.firstChild)
      }

      // Replace original element with new one in the DOM
      if (element.parentNode) {
        element.parentNode.replaceChild(newElement, element)
      }
    } catch (error) {
      console.error(`Error converting ${element.tagName} to ${newTagName}:`, error)
    }
  }

  // Helper function to wrap element contents in a styled tag
  function wrapElementContents(element: Element, wrapperTag: string): void {
    // Skip if element has no text content or already has the tag as a child
    if (
      !element.textContent?.trim() ||
      element.children.length === 0 ||
      element.querySelector(wrapperTag)
    ) {
      return
    }

    try {
      // Create new wrapper element
      const wrapper = document.createElement(wrapperTag)

      // Move all children to the wrapper
      while (element.firstChild) {
        wrapper.appendChild(element.firstChild)
      }

      // Append wrapper to original element
      element.appendChild(wrapper)
    } catch (error) {
      console.error(`Error wrapping element with ${wrapperTag}:`, error)
    }
  }

  // Convert divs with inline-ish displays to spans
  const inlineElements = document.querySelectorAll(
    '[data-display="inline"], [data-display="inline-block"], [data-display="flex"], [data-display="inline-flex"]'
  )
  inlineElements.forEach((element) => {
    const tagName = element.tagName.toLowerCase()
    if (tagName === 'div') {
      convertElementTag(element, 'span')
    }
    element.removeAttribute('data-display')
  })

  // Process bold text elements
  const boldElements = document.querySelectorAll('[fontweight="bold"]')
  boldElements.forEach((element) => {
    wrapElementContents(element, 'b')
    element.removeAttribute('fontweight')
  })

  // Process italic text elements
  const italicElements = document.querySelectorAll('[fontstyle="italic"]')
  italicElements.forEach((element) => {
    wrapElementContents(element, 'i')
    element.removeAttribute('fontstyle')
  })

  // Process underlined text elements
  const underlineElements = document.querySelectorAll('[textstyle="underline"]')
  underlineElements.forEach((element) => {
    wrapElementContents(element, 'u')
    element.removeAttribute('textstyle')
  })
}

// Helper function to convert CSS font size to legacy HTML size attribute (1-7)
function convertFontSizeToLegacy(fontSize: string): string {
  const sizeInPx = parseFloat(fontSize)
  if (isNaN(sizeInPx)) return ''

  // Approximate mapping of pixel sizes to HTML size attribute values
  if (sizeInPx <= 9) return '1'
  if (sizeInPx <= 11) return '2'
  if (sizeInPx <= 13) return '3'
  if (sizeInPx <= 16) return '4' // Default
  if (sizeInPx <= 19) return '5'
  if (sizeInPx <= 24) return '6'
  return '7' // Largest
}

// Convert RGB color to hex or named color for better compatibility
function rgbToHexOrName(rgb: string): string {
  // Handle named colors directly
  if (rgb.match(/^[a-z]+$/i)) {
    return rgb
  }

  // Extract RGB values
  const rgbMatch = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/)
  if (!rgbMatch) return rgb

  const r = parseInt(rgbMatch[1], 10)
  const g = parseInt(rgbMatch[2], 10)
  const b = parseInt(rgbMatch[3], 10)

  // Convert to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
