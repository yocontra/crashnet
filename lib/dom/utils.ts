// Utility functions for DOM manipulation and styling

// Convert RGB color to hex or named color for better compatibility
export function rgbToHexOrName(rgb: string): string {
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
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`
}

// Convert CSS font size to legacy HTML size attribute (1-7)
export function convertFontSizeToLegacy(fontSize: string): string {
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
