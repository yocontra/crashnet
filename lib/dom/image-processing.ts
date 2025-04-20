import { PlaywrightPage } from '../fetch'
import { APP_BASE_URL } from './constants'
import parseSrcset from 'srcset-parse'
import { VIEWPORT_WIDTH } from '../config'

// Process images in the document - handles proxying and size constraints
export async function handleImages(
  pw: PlaywrightPage,
  baseUrl: string,
  isReadMode: boolean = false,
  appBaseUrl?: string
): Promise<void> {
  // Use provided appBaseUrl or fall back to APP_BASE_URL constant
  const baseUrlToUse = appBaseUrl || APP_BASE_URL

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
          const match = srcset?.match(/^\s*([^\s,]+)/)
          if (match && match[1]) {
            src = match[1]
          }
        }

        if (!src) continue

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
    { baseUrl, isReadMode, appBaseUrl: baseUrlToUse }
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
      let width = targetWidth // Default

      // Handle sources with width descriptor
      if (source.width) {
        width = source.width
      }
      // Handle sources with density descriptor (e.g. 2x)
      else if (source.density) {
        width = targetWidth * source.density
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

// Process SVGs and convert them to images using the image proxy
export async function handleSVGs(pw: PlaywrightPage, appBaseUrl?: string): Promise<void> {
  // Use provided appBaseUrl or fall back to APP_BASE_URL constant
  const baseUrlToUse = appBaseUrl || APP_BASE_URL

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
    { appBaseUrl: baseUrlToUse }
  )
}

// Process <picture> elements before any other transformations
export async function processPictureElements(pw: PlaywrightPage): Promise<void> {
  // Set viewport to a small size to force selection of low-resolution images
  await pw.page.setViewportSize({ width: 320, height: 568 })

  await pw.page.evaluate(() => {
    const pictures = document.querySelectorAll('picture')

    for (const picture of pictures) {
      // First try to get the img inside the picture
      const img = picture.querySelector('img')

      // If there's no img element, try to handle sources directly
      if (!img) {
        const firstSource = picture.querySelector('source')
        if (!firstSource) continue

        const newImg = document.createElement('img')
        let srcFound = false

        // Try to get source from srcset
        if (firstSource.hasAttribute('srcset')) {
          const srcset = firstSource.getAttribute('srcset')
          const match = srcset?.match(/^\s*([^\s,]+)/)
          if (match && match[1]) {
            newImg.setAttribute('src', match[1])
            srcFound = true
          }
        }
        // Or from src attribute
        else if (firstSource.hasAttribute('src')) {
          newImg.setAttribute('src', firstSource.getAttribute('src') || '')
          srcFound = true
        }

        if (srcFound && picture.parentNode) {
          picture.parentNode.replaceChild(newImg, picture)
        }
        continue
      }

      // Create a new img element with just the resolved source
      const newImg = document.createElement('img')

      // Resolve the best source - try multiple approaches
      let bestSrc = ''

      // First try to get the currentSrc (browser-resolved source)
      if (img.currentSrc) {
        bestSrc = img.currentSrc
      }
      // Then try the direct src attribute
      else if (img.getAttribute('src')) {
        bestSrc = img.getAttribute('src') || ''
      }
      // If no src found, try to get it from a source element
      else {
        // Find the first source element with a matching media query or no media query
        const sources = picture.querySelectorAll('source')

        // Try to find a source with no media query first (fallback)
        let fallbackSource = null

        for (const source of sources) {
          // If the source has no media query or matches the small viewport
          if (
            !source.hasAttribute('media') ||
            window.matchMedia(source.getAttribute('media') || '').matches
          ) {
            // Check if it has srcset or src
            if (source.hasAttribute('srcset')) {
              // Get the first URL from srcset (simplification for old browsers)
              const srcset = source.getAttribute('srcset')
              const match = srcset?.match(/^\s*([^\s,]+)/)
              if (match && match[1]) {
                bestSrc = match[1]
                break
              }
            } else if (source.hasAttribute('src')) {
              bestSrc = source.getAttribute('src') || ''
              break
            }
          }

          // Keep track of a fallback source (any source without media queries)
          if (!source.hasAttribute('media') && !fallbackSource) {
            fallbackSource = source
          }
        }

        // If no matching source with the right media query, use the fallback
        if (!bestSrc && fallbackSource) {
          if (fallbackSource.hasAttribute('srcset')) {
            const srcset = fallbackSource.getAttribute('srcset')
            const match = srcset?.match(/^\s*([^\s,]+)/)
            if (match && match[1]) {
              bestSrc = match[1]
            }
          } else if (fallbackSource.hasAttribute('src')) {
            bestSrc = fallbackSource.getAttribute('src') || ''
          }
        }
      }

      // If we couldn't find any source, skip this picture element
      if (!bestSrc) continue

      newImg.setAttribute('src', bestSrc)

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
