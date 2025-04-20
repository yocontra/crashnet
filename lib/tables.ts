import { PlaywrightPage } from './fetch'

// Convert HTML tables to a simpler layout for vintage browsers
// This function converts all tables, regardless of borders or styling
export async function convertTablesToLayout(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    // Process tables from the outermost to the innermost
    function processTablesRecursively(root = document) {
      // Get all tables at this level that haven't been processed yet
      const tables = root.querySelectorAll('table:not([data-processed])')

      // If no tables found, we're done with this level
      if (tables.length === 0) return

      // Process each table at this level
      for (const table of tables) {
        // Mark table as processed to prevent processing it again
        table.setAttribute('data-processed', 'true')

        // First, process any nested tables
        processTablesRecursively(table)

        // Now convert this table
        convertTableToDiv(table)
      }
    }

    // Convert a single table to divs
    function convertTableToDiv(table) {
      // Create a container for the table replacement
      const container = document.createElement('div')

      // Copy key attributes from table to container
      copyAttributes(table, container, ['id', 'class', 'align', 'width'])

      // Set alignment center by default if not specified
      if (!container.hasAttribute('align')) {
        container.setAttribute('align', 'center')
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

        // Create a container for this row
        const rowDiv = document.createElement('div')

        // Copy row attributes
        copyAttributes(row, rowDiv, ['id', 'class', 'align', 'valign', 'bgcolor'])

        // If no alignment specified, use table's alignment or center
        if (!rowDiv.hasAttribute('align')) {
          rowDiv.setAttribute('align', container.getAttribute('align') || 'center')
        }

        // If this is a header row, wrap content in <b> tags
        const isHeader = row.querySelector('th') !== null

        // Create a flexbox container for cells if there's more than one cell
        let rowContent = rowDiv
        if (cells.length > 1) {
          // Use nested divs instead of flexbox for better compatibility
          rowContent.style.textAlign = rowDiv.getAttribute('align') || 'center'
        }

        // Add cells to the row
        for (let j = 0; j < cells.length; j++) {
          const cell = cells[j]

          // Create a container for each cell
          const cellDiv = document.createElement('div')

          // Copy cell attributes
          copyAttributes(cell, cellDiv, ['id', 'class', 'align', 'valign', 'width', 'height'])

          // If this is a single-cell row, use full width
          if (cells.length === 1) {
            cellDiv.setAttribute('width', '100%')
          } else {
            // For multiple cells, try to approximate width
            if (!cellDiv.hasAttribute('width')) {
              const approxWidth = Math.floor(100 / cells.length)
              cellDiv.setAttribute('width', `${approxWidth}%`)
            }

            // For layout purposes, display cells next to each other
            cellDiv.style.display = 'inline-block'

            // Add spacing between cells
            if (j < cells.length - 1 && cellspacing > 0) {
              cellDiv.style.marginRight = `${cellspacing}px`
            }
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

          // Get the cell's content - don't use innerHTML directly
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

          rowContent.appendChild(cellDiv)
        }

        // Add the row to the container
        container.appendChild(rowDiv)

        // Add separator between rows
        if (i < rows.length - 1) {
          // Add horizontal rule if the table had a border
          if (hasBorder) {
            const hr = document.createElement('hr')
            hr.setAttribute('width', '100%')
            hr.setAttribute('size', '1')
            container.appendChild(hr)
          } else if (cellspacing > 0) {
            // Add spacing between rows equivalent to cellspacing
            const spacer = document.createElement('div')
            spacer.style.height = `${cellspacing}px`
            container.appendChild(spacer)
          }
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
    function copyAttributes(source, target, attributeNames) {
      for (const name of attributeNames) {
        if (source.hasAttribute(name)) {
          target.setAttribute(name, source.getAttribute(name))
        }
      }
    }

    // Start the conversion process from the outermost tables
    processTablesRecursively()
  })
}
