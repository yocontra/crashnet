import { PlaywrightPage } from './fetch'

// Convert HTML tables to a simpler layout for vintage browsers
// This function converts all tables, regardless of borders or styling
export async function convertTablesToLayout(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    // Process tables from the outermost to the innermost
    function processTablesRecursively(root: Document | Element = document) {
      // Get all tables at this level that haven't been processed yet
      const tables = root.querySelectorAll('table:not([data-processed])')

      // If no tables found, we're done with this level
      if (tables.length === 0) return

      // Process each table at this level
      for (const table of tables) {
        // Mark table as processed to prevent processing it again
        table.setAttribute('data-processed', 'true')

        // First, process any nested tables
        const nestedTables = table.querySelectorAll('table:not([data-processed])')
        if (nestedTables.length > 0) {
          processTablesRecursively(table)
        }

        // Now convert this table
        convertTableToDiv(table as Element)
      }
    }

    // Convert a single table to divs
    function convertTableToDiv(table: Element) {
      // Create a container for the table replacement
      const container = document.createElement('div')

      // Copy key attributes from table to container (except align)
      copyAttributes(table, container, ['id', 'class', 'width'])

      // Only preserve table alignment if explicitly set
      const tableAlign = table.getAttribute('align')
      if (tableAlign) {
        container.setAttribute('align', tableAlign)
      }

      // Get any table attributes we want to preserve
      const bgcolor = table.getAttribute('bgcolor')
      if (bgcolor) {
        container.setAttribute('bgcolor', bgcolor)
      }

      // Get table width
      const width = table.getAttribute('width') || '100%'
      container.setAttribute('width', width)

      // Get cell spacing/padding
      const cellspacing = parseInt(table.getAttribute('cellspacing') || '0', 10)
      const cellpadding = parseInt(table.getAttribute('cellpadding') || '0', 10)

      // Check if the table has a border
      const hasBorder = table.hasAttribute('border') && table.getAttribute('border') !== '0'

      // Process the table rows
      const rows = table.querySelectorAll('tr')

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const cells = row.querySelectorAll('td, th')

        // Skip rows with no cells
        if (cells.length === 0) continue

        // Create a container for this row
        const rowDiv = document.createElement('div')

        // Copy row attributes (except align)
        copyAttributes(row, rowDiv, ['id', 'class', 'valign', 'bgcolor'])

        // Only apply row alignment if explicitly set on the row
        const rowAlign = row.getAttribute('align')
        if (rowAlign) {
          rowDiv.setAttribute('align', rowAlign)
        }

        // If this is a header row, wrap content in <b> tags
        const isHeader = row.querySelector('th') !== null

        // Add cells to the row
        for (let j = 0; j < cells.length; j++) {
          const cell = cells[j]

          // Create a container for each cell
          const cellDiv = document.createElement('div')

          // Copy cell attributes
          copyAttributes(cell, cellDiv, ['id', 'class', 'align', 'valign', 'width', 'height'])

          // Set appropriate width based on number of cells
          if (cells.length === 1) {
            // Single-cell row uses full width
            cellDiv.setAttribute('width', '100%')
          } else if (!cellDiv.hasAttribute('width')) {
            // For multiple cells without width, distribute evenly
            const approxWidth = Math.floor(100 / cells.length)
            cellDiv.setAttribute('width', `${approxWidth}%`)
            cellDiv.style.display = 'inline-block'

            // Add spacing between cells (except last)
            if (j < cells.length - 1 && cellspacing > 0) {
              cellDiv.style.marginRight = `${cellspacing}px`
            }
          } else {
            // Cell has width but still needs to be inline for layout
            cellDiv.style.display = 'inline-block'
          }

          // Apply cell background color if present
          const cellBgColor = cell.getAttribute('bgcolor')
          if (cellBgColor) {
            cellDiv.setAttribute('bgcolor', cellBgColor)
          }

          // Add padding to the cell if needed
          if (cellpadding > 0) {
            cellDiv.style.padding = `${cellpadding}px`
          }

          // Check for colspan and adjust width
          const colspan = parseInt(cell.getAttribute('colspan') || '1', 10)
          if (colspan > 1 && cells.length > 1) {
            const currentWidth = parseInt(cellDiv.getAttribute('width') || '0', 10)
            const newWidth = currentWidth * colspan
            cellDiv.setAttribute('width', `${newWidth}%`)
          }

          // Get the cell's content
          const cellContent = cell.innerHTML

          // Add content, wrapping in <b> if this is a header cell
          if (isHeader || cell.tagName.toLowerCase() === 'th') {
            const cellContentDiv = document.createElement('div')
            const bold = document.createElement('b')
            bold.innerHTML = cellContent
            cellContentDiv.appendChild(bold)
            cellDiv.appendChild(cellContentDiv)
          } else {
            // Regular cell
            cellDiv.innerHTML = cellContent
          }

          rowDiv.appendChild(cellDiv)
        }

        // Add the row to the container
        container.appendChild(rowDiv)

        // Add separator between rows (not for the last row)
        if (i >= rows.length - 1) continue

        // Add appropriate separator based on border and spacing
        if (hasBorder) {
          const hr = document.createElement('hr')
          hr.setAttribute('width', '100%')
          hr.setAttribute('size', '1')
          container.appendChild(hr)
        } else if (cellspacing > 0) {
          const spacer = document.createElement('div')
          spacer.style.height = `${cellspacing}px`
          container.appendChild(spacer)
        }
      }

      // Add a bottom border if the table had a border
      if (hasBorder) {
        const hr = document.createElement('hr')
        hr.setAttribute('width', '100%')
        hr.setAttribute('size', '1')
        container.appendChild(hr)
      }

      // Replace the table with our simple layout
      if (table.parentNode) {
        table.parentNode.replaceChild(container, table)
      }
    }

    // Helper function to copy attributes from one element to another
    function copyAttributes(source: Element, target: Element, attributeNames: string[]) {
      for (const name of attributeNames) {
        if (source.hasAttribute(name)) {
          const attrValue = source.getAttribute(name)
          if (attrValue !== null) {
            target.setAttribute(name, attrValue)
          }
        }
      }
    }

    // Start the conversion process from the outermost tables
    processTablesRecursively()
  })
}
