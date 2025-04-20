import { PlaywrightPage } from '../fetch'

// Preserve computed styles as DOM attributes before stripping CSS
export async function preserveComputed(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    // Helper function to convert RGB color to hex or named color for better compatibility
    function rgbToHexOrName(rgb: string): string {
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
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
        .toString(16)
        .padStart(2, '0')}`
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
    const elements = document.querySelectorAll('*')

    for (const element of elements) {
      const computedStyle = getComputedStyle(element)
      const tagName = element.tagName.toLowerCase()

      // First, check if this element directly contains any text nodes
      let hasTextNode = false
      for (let i = 0; i < element.childNodes.length; i++) {
        if (element.childNodes[i].nodeType === 3 && element.childNodes[i].textContent?.trim()) {
          hasTextNode = true
          break
        }
      }

      // Only apply font styling to elements with direct text content
      if (hasTextNode) {
        let needsFontTag = false
        const fontAttributes = {} as { color?: string; face?: string; size?: string }

        // Preserve text color - convert to hex or named color for older browsers
        if (computedStyle.color) {
          const color = rgbToHexOrName(computedStyle.color)
          fontAttributes.color = color
          needsFontTag = true
        }

        // Preserve font family - map to Mac SE compatible fonts
        if (computedStyle.fontFamily) {
          const originalFont = computedStyle.fontFamily
            .split(',')[0]
            .trim()
            .replace(/["']/g, '')
            .toLowerCase()

          // Map modern fonts to vintage Mac SE fonts
          let macFont = 'Times'

          // Sans-serif fonts map to Geneva/Helvetica
          if (
            /arial|helvetica|sans-serif|system-ui|roboto|verdana|tahoma|trebuchet|calibri|segoe ui|open sans|noto sans/i.test(
              originalFont
            )
          ) {
            macFont = 'Geneva'
          }
          // Monospace fonts map to Monaco/Courier
          else if (
            /monospace|courier|consolas|menlo|monaco|source code|fira code|ubuntu mono|andale|lucida console/i.test(
              originalFont
            )
          ) {
            macFont = 'Monaco'
          }
          // Display/UI fonts map to Chicago
          else if (
            /impact|comic sans|futura|gill sans|optima|lucida grande|avenir|copperplate|palatino/i.test(
              originalFont
            )
          ) {
            macFont = 'Chicago'
          }
          // Default serif fonts map to Times/New York
          else if (
            /times|new york|georgia|cambria|garamond|baskerville|serif/i.test(originalFont)
          ) {
            macFont = 'Times'
          }

          fontAttributes.face = macFont
          needsFontTag = true
        }

        // Font size as legacy size attribute (1-7)
        if (computedStyle.fontSize) {
          const size = convertFontSizeToLegacy(computedStyle.fontSize)
          if (size) {
            fontAttributes.size = size
            needsFontTag = true
          }
        }

        // Check if we're just using default values
        const isDefaultColor =
          !fontAttributes.color ||
          fontAttributes.color === '#000000' ||
          fontAttributes.color === 'black'
        const isDefaultSize = !fontAttributes.size || fontAttributes.size === '4'
        const isDefaultFont =
          !fontAttributes.face ||
          ['times', 'times new roman', 'serif'].includes(fontAttributes.face.toLowerCase())

        // Only add font tag if we're not using all defaults
        if (needsFontTag && !(isDefaultColor && isDefaultSize && isDefaultFont)) {
          // Store font attributes as data attributes for later processing
          element.setAttribute('data-font-color', fontAttributes.color || '')
          element.setAttribute('data-font-face', fontAttributes.face || '')
          element.setAttribute('data-font-size', fontAttributes.size || '')
          element.setAttribute('data-needs-font-tag', 'true')
        }
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
      // Font attributes are already collected above

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

    // Process elements with special style markers and wrap them in appropriate vintage HTML tags
    function processComputedStyleTags() {
      // Helper function to wrap element contents in a styled tag
      function wrapElementContents(element: Element, wrapperTag: string) {
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

      // Process font attributes first (they need to be the innermost wrappers)
      const fontElements = document.querySelectorAll('[data-needs-font-tag="true"]')
      for (const element of fontElements) {
        // Create a font tag with the collected attributes
        const fontTag = document.createElement('font')

        // Apply the font attributes
        const color = element.getAttribute('data-font-color')
        if (color && color.trim() !== '') {
          fontTag.setAttribute('color', color)
        }

        const face = element.getAttribute('data-font-face')
        if (face && face.trim() !== '') {
          fontTag.setAttribute('face', face)
        }

        const size = element.getAttribute('data-font-size')
        if (size && size.trim() !== '') {
          fontTag.setAttribute('size', size)
        }

        // Move all children to the font tag
        while (element.firstChild) {
          fontTag.appendChild(element.firstChild)
        }

        // Add the font tag back to the element
        element.appendChild(fontTag)

        // Clean up data attributes
        element.removeAttribute('data-font-color')
        element.removeAttribute('data-font-face')
        element.removeAttribute('data-font-size')
        element.removeAttribute('data-needs-font-tag')
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
