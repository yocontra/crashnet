import { PlaywrightPage } from './fetch'
import { getCrashnetHeader } from './header'
import { VIEWPORT_WIDTH } from './config'
import parseSrcset from 'srcset-parse'

// App base URL for image proxy - imported dynamically in browser context
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000'

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

// Selectors for elements that should be removed
export const REMOVE_SELECTORS = [
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
  'button', // surprisingly from html4.0

  // Style and script
  'style',
  'noscript',

  // Meta information
  'meta',
  'link',

  // Dialog elements and useless elements
  '[role="dialog"]',

  // Inputs not inside forms - they're useless without a form
  'input:not(form input)',
  'textarea:not(form textarea)',
  'select:not(form select)',
  'button:not(form button)',
]

// Process images in the document - handles proxying and size constraints
export async function handleImages(
  pw: PlaywrightPage,
  baseUrl: string,
  isReadMode: boolean = false
): Promise<void> {
  await pw.page.evaluate(
    async (params) => {
      const { baseUrl, isReadMode, appBaseUrl } = params
      const images = document.querySelectorAll('img')

      for (const img of images) {
        // Get the current src that the browser has resolved
        // Browser will have already selected the best image from srcset if present
        let src = img.currentSrc || img.src || img.getAttribute('src')

        // If somehow we still don't have a src, try to get it from srcset
        if (!src && img.hasAttribute('srcset')) {
          const srcset = img.getAttribute('srcset')
          // Very simple fallback - just grab the first URL in the srcset
          const match = srcset.match(/^\s*([^\s,]+)/)
          if (match && match[1]) {
            src = match[1]
          }
        }

        if (src) {
          try {
            // Get absolute URL
            let absoluteSrc
            if (src.startsWith('http') || src.startsWith('//')) {
              absoluteSrc = src.startsWith('//') ? 'https:' + src : src
            } else {
              // Construct absolute URL from base
              const url = new URL(src, baseUrl)
              absoluteSrc = url.toString()
            }

            const proxyUrl = `${appBaseUrl}/image_proxy?url=${encodeURIComponent(absoluteSrc)}`
            img.setAttribute('src', proxyUrl)

            // Set max width and height constraints
            const MAX_WIDTH = 640 // TARGET_WIDTH value

            // Get current width/height attributes
            let width = img.getAttribute('width')
            let height = img.getAttribute('height')

            // If no width/height attributes, try to get from computed style
            if (!width || !height) {
              const computedStyle = getComputedStyle(img)
              if (!width && computedStyle.width) {
                width = computedStyle.width.replace('px', '')
              }
              if (!height && computedStyle.height) {
                height = computedStyle.height.replace('px', '')
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

          // Get dimensions from attributes or computed style
          let width = img.getAttribute('width')
          let height = img.getAttribute('height')

          // If no width/height attributes, try to get from computed style
          if (!width || !height) {
            const computedStyle = getComputedStyle(img)
            if (!width && computedStyle.width) {
              width = computedStyle.width.replace('px', '')
            }
            if (!height && computedStyle.height) {
              height = computedStyle.height.replace('px', '')
            }
          }

          const border = img.getAttribute('border')

          // Clear all attributes (by creating a new element)
          const newImg = document.createElement('img')
          if (src) newImg.setAttribute('src', src)
          if (alt) newImg.setAttribute('alt', alt)
          if (width) newImg.setAttribute('width', width)
          if (height) newImg.setAttribute('height', height)
          if (border) newImg.setAttribute('border', border)

          img.parentNode?.replaceChild(newImg, img)
        }
      }
    },
    { baseUrl, isReadMode, appBaseUrl: APP_BASE_URL }
  )
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
export async function processLinksForProxy(
  pw: PlaywrightPage,
  baseUrl: string,
  isReadMode = false
): Promise<void> {
  await pw.page.evaluate(
    async (params) => {
      const { baseUrl, isReadMode, appBaseUrl } = params
      // Process anchor links
      const links = document.querySelectorAll('a')

      for (const link of links) {
        const href = link.getAttribute('href')

        // Remove javascript: links entirely
        if (href && href.startsWith('javascript:')) {
          link.parentNode?.removeChild(link)
          continue
        }

        if (href && !href.startsWith('#')) {
          try {
            // Get absolute URL
            let absoluteHref
            if (href.startsWith('http') || href.startsWith('//')) {
              absoluteHref = href.startsWith('//') ? 'https:' + href : href
            } else {
              // Construct absolute URL from base
              const url = new URL(href, baseUrl)
              absoluteHref = url.toString()
            }

            // Add read parameter if in reading mode
            const readParam = isReadMode ? 'read=true&' : ''
            const proxyUrl = `${appBaseUrl}/proxy?${readParam}url=${encodeURIComponent(absoluteHref)}`
            link.setAttribute('href', proxyUrl)
          } catch (error) {
            console.error(`Error processing link: ${href}`, error)
          }
        }
      }

      // Process form actions
      const forms = document.querySelectorAll('form')

      for (const form of forms) {
        const action = form.getAttribute('action')
        if (action) {
          try {
            // Skip forms that already point to our proxy
            if (
              action.startsWith('/proxy') ||
              action === '/' ||
              action.startsWith(`${appBaseUrl}/proxy`)
            ) {
              continue
            }

            // Get absolute URL
            let absoluteAction
            if (action.startsWith('http') || action.startsWith('//')) {
              absoluteAction = action.startsWith('//') ? 'https:' + action : action
            } else {
              // Construct absolute URL from base
              const url = new URL(action, baseUrl)
              absoluteAction = url.toString()
            }

            // Set action to our proxy endpoint
            const proxyUrl = `${appBaseUrl}/proxy`
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
      }
    },
    { baseUrl, isReadMode, appBaseUrl: APP_BASE_URL }
  )
}

// Add the Crashnet header to the document
export async function addCrashnetHeader(pw: PlaywrightPage, url: string): Promise<void> {
  const header = getCrashnetHeader(url, false)
  await pw.page.evaluate(
    (params) => {
      const { header } = params
      const headerDiv = document.createElement('div')
      headerDiv.innerHTML = header
      document.body.insertBefore(headerDiv, document.body.firstChild)
    },
    { header }
  )
}

// Replace modern tags with vintage equivalents
export async function replaceModernTags(pw: PlaywrightPage): Promise<void> {
  // First, process <picture> elements before any other transformations
  await processPictureElements(pw)

  await pw.page.evaluate(() => {
    // Convert <strong> tags to <b> tags
    const strongTags = document.querySelectorAll('strong')
    for (const strongTag of strongTags) {
      const b = document.createElement('b')
      while (strongTag.firstChild) {
        b.appendChild(strongTag.firstChild)
      }
      strongTag.parentNode?.replaceChild(b, strongTag)
    }

    // Convert <em> tags to <i> tags
    const emTags = document.querySelectorAll('em')
    for (const emTag of emTags) {
      const i = document.createElement('i')
      while (emTag.firstChild) {
        i.appendChild(emTag.firstChild)
      }
      emTag.parentNode?.replaceChild(i, emTag)
    }

    // Convert form buttons to input type=submit
    const formButtons = document.querySelectorAll('form button')
    for (const button of formButtons) {
      const buttonText = button.textContent || 'Submit'
      const input = document.createElement('input')
      input.setAttribute('type', 'submit')
      input.setAttribute('value', buttonText.trim())

      // Copy any name attribute
      if (button.hasAttribute('name')) {
        input.setAttribute('name', button.getAttribute('name') || '')
      }

      // Check if button is disabled
      if (button.hasAttribute('disabled')) {
        input.setAttribute('disabled', '')
      }

      button.parentNode?.replaceChild(input, button)
    }
  })
}

async function processPictureElements(pw: PlaywrightPage): Promise<void> {
  // Set viewport to a small size to force selection of low-resolution images
  await pw.page.setViewportSize({ width: 320, height: 568 })

  await pw.page.evaluate(() => {
    const pictures = document.querySelectorAll('picture')

    for (const picture of pictures) {
      const img = picture.querySelector('img')
      if (!img) continue

      // The browser has already selected the appropriate image based on our viewport
      // and media queries - we just need to get that image and replace the picture element

      // The browser has already selected the appropriate source

      // Create a new img element with just the resolved source
      const newImg = document.createElement('img')

      // Copy the rendered image's src
      newImg.setAttribute('src', img.currentSrc || img.src)

      // Copy other important attributes
      if (img.hasAttribute('alt')) newImg.setAttribute('alt', img.getAttribute('alt') || '')
      if (img.hasAttribute('width')) newImg.setAttribute('width', img.getAttribute('width') || '')
      if (img.hasAttribute('height'))
        newImg.setAttribute('height', img.getAttribute('height') || '')

      // Replace the picture element with our simpler img
      if (picture.parentNode) {
        picture.parentNode.replaceChild(newImg, picture)
      }
    }
  })
}

// Remove unwanted elements from the document
export async function removeUnwantedElements(pw: PlaywrightPage): Promise<void> {
  const selectors = REMOVE_SELECTORS
  await pw.page.evaluate(
    (params) => {
      const { selectors } = params

      // Create a combined selector by joining all selectors with commas
      const combinedSelector = selectors.join(', ')

      // Find all elements matching any of the selectors
      const elementsToRemove = document.querySelectorAll(combinedSelector)

      // Remove each element
      elementsToRemove.forEach((element) => element.remove())
    },
    { selectors }
  )
}

// Set basic styling attributes on the body
export async function setBodyAttributes(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    document.body.setAttribute('bgcolor', 'white')
    document.body.setAttribute('text', 'black')
    document.body.setAttribute('link', 'blue')
    document.body.setAttribute('vlink', 'purple')
  })
}

// Process SVGs and convert them to images using the image proxy
export async function handleSVGs(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(
    (params) => {
      const { appBaseUrl } = params
      const svgs = document.querySelectorAll('svg')
      for (const svg of svgs) {
        // Get dimensions from computed style
        const computedStyle = getComputedStyle(svg)
        let width = computedStyle.width || svg.getAttribute('width') || '100'
        let height = computedStyle.height || svg.getAttribute('height') || '100'

        // Remove 'px' if present
        width = width.replace('px', '')
        height = height.replace('px', '')

        // Create serialized SVG string for the placeholder image
        // XMLSerializer is available in the browser context
        let svgString
        try {
          const serializer = new XMLSerializer()
          svgString = serializer.serializeToString(svg)
        } catch (error) {
          console.error('Error serializing SVG:', error)
          // Fallback content
          svgString =
            '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ddd"/></svg>'
        }
        const svgURL = 'data:image/svg+xml;base64,' + btoa(svgString)

        // Create an img tag as replacement
        const imgElement = document.createElement('img')
        imgElement.setAttribute('width', width)
        imgElement.setAttribute('height', height)

        try {
          // Create proxy URL for the SVG
          const proxyUrl = `${appBaseUrl}/image_proxy?url=${encodeURIComponent(svgURL)}`
          imgElement.setAttribute('src', proxyUrl)
          imgElement.setAttribute('alt', 'SVG Image')

          // Apply size constraints to ensure rendering compatibility
          const MAX_WIDTH = 640 // TARGET_WIDTH value

          // If width is specified and exceeds our limit
          if (width && parseInt(width, 10) > MAX_WIDTH) {
            const originalWidth = parseInt(width, 10)
            const originalHeight = height ? parseInt(height, 10) : 0

            // Set constrained width
            imgElement.setAttribute('width', MAX_WIDTH.toString())

            // Adjust height proportionally if available
            if (originalHeight != null && originalWidth != null) {
              const scaledHeight = Math.round((originalHeight * MAX_WIDTH) / originalWidth)
              imgElement.setAttribute('height', scaledHeight.toString())
            }
          }

          // If no width is specified, set a maximum width
          if (!width) {
            imgElement.setAttribute('width', MAX_WIDTH.toString())
          }
        } catch (error) {
          console.error('Error creating proxy URL for SVG:', error)
          // Fallback for error cases
          imgElement.setAttribute('alt', 'SVG Image (conversion failed)')
        }

        // Replace the SVG with the img element
        svg.parentNode?.replaceChild(imgElement, svg)
      }
    },
    { appBaseUrl: APP_BASE_URL }
  )
}

// Replace video tags with black background divs
export async function handleVideoTags(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    const videos = document.querySelectorAll('video')

    for (const video of videos) {
      // Get dimensions from computed style or attributes
      const computedStyle = getComputedStyle(video)
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
    }
  })
}

// Replace audio tags with download links
export async function handleAudioTags(pw: PlaywrightPage, baseUrl: string): Promise<void> {
  await pw.page.evaluate(
    (params) => {
      const { baseUrl } = params
      const audios = document.querySelectorAll('audio')

      for (const audio of audios) {
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
            let absoluteSrc
            if (audioSrc.startsWith('http') || audioSrc.startsWith('//')) {
              absoluteSrc = audioSrc.startsWith('//') ? 'https:' + audioSrc : audioSrc
            } else {
              // Construct absolute URL from base
              const url = new URL(audioSrc, baseUrl)
              absoluteSrc = url.toString()
            }

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
      }
    },
    { baseUrl }
  )
}

// Remove modern attributes from all elements
export async function removeModernAttributesFromAll(pw: PlaywrightPage): Promise<void> {
  const modernAttributes = MODERN_ATTRIBUTES
  await pw.page.evaluate(
    (params) => {
      const { modernAttributes } = params
      const allElements = document.querySelectorAll('*')

      for (const element of allElements) {
        // Get all attributes
        const attributes = Array.from(element.attributes)

        // Check each attribute against the list of modern attributes
        for (const attr of attributes) {
          const name = attr.name.toLowerCase()

          // Check if the attribute name starts with any of the modern attribute prefixes
          if (modernAttributes.some((prefix) => name.startsWith(prefix))) {
            element.removeAttribute(attr.name)
          }
        }
      }
    },
    { modernAttributes }
  )
}

// Remove elements with display:none based on computed style
export async function removeHiddenElements(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    const elements = document.querySelectorAll('*')

    for (const element of elements) {
      const computedStyle = getComputedStyle(element)
      if (computedStyle?.display === 'none' || computedStyle?.visibility === 'hidden') {
        element.remove()
      }
    }
  })
}

// Preserve computed styles as DOM attributes before stripping CSS
export async function preserveComputed(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    const elements = document.querySelectorAll('*')

    for (const element of elements) {
      const computedStyle = getComputedStyle(element)
      const tagName = element.tagName.toLowerCase()

      // Preserve text color - convert to hex or named color for older browsers
      if (computedStyle.color) {
        const color = rgbToHexOrName(computedStyle.color)
        element.setAttribute('color', color) // TODO: need to use <font color=""> wrapper here
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
    }

    // Process for wrapping elements with styling markers in appropriate HTML tags
    processComputedStyleTags()

    // Helper function to convert RGB color to hex or named color for better compatibility
    function rgbToHexOrName(rgb) {
      // Handle named colors directly
      if (rgb.match(/^[a-z]+$/i)) {
        return rgb
      }

      // Extract RGB values
      const rgbMatch = rgb.match(
        /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/
      )
      if (!rgbMatch) return rgb

      const r = parseInt(rgbMatch[1], 10)
      const g = parseInt(rgbMatch[2], 10)
      const b = parseInt(rgbMatch[3], 10)

      // Convert to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    // Helper function to convert CSS font size to legacy HTML size attribute (1-7)
    function convertFontSizeToLegacy(fontSize) {
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

    // Process elements with special style markers and wrap them in appropriate vintage HTML tags
    function processComputedStyleTags() {
      // Helper function to wrap element contents in a styled tag
      function wrapElementContents(element, wrapperTag) {
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

      for (const element of inlineElements) {
        const tagName = element.tagName.toLowerCase()
        if (tagName === 'div') {
          // Create a span with the same attributes and contents
          const span = document.createElement('span')
          // Copy attributes
          for (const attr of element.attributes) {
            span.setAttribute(attr.name, attr.value)
          }
          // Copy children
          while (element.firstChild) {
            span.appendChild(element.firstChild)
          }
          if (element.parentNode) {
            element.parentNode.replaceChild(span, element)
          }
        }
        element.removeAttribute('data-display')
      }

      // Process bold text elements
      const boldElements = document.querySelectorAll('[fontweight="bold"]')
      for (const element of boldElements) {
        wrapElementContents(element, 'b')
        element.removeAttribute('fontweight')
      }

      // Process italic text elements
      const italicElements = document.querySelectorAll('[fontstyle="italic"]')
      for (const element of italicElements) {
        wrapElementContents(element, 'i')
        element.removeAttribute('fontstyle')
      }

      // Process underlined text elements
      const underlineElements = document.querySelectorAll('[textstyle="underline"]')
      for (const element of underlineElements) {
        wrapElementContents(element, 'u')
        element.removeAttribute('textstyle')
      }
    }
  })
}
