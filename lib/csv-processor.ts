import Papa from "papaparse"
import type { PackingSlipData, CSVProcessResult } from "./types"
import { normalizeAddressKey, sortOrderIdsOldestFirst } from "./atenea-csv"
import { readProductImagesMap } from "./products"

// One parcel can only carry one address: packing slips group per buyer AND per
// distinct shipping address (zip + street + house), so a buyer whose orders
// name different addresses gets one slip per address.
function slipGroupKey(username: string, zip: string, address1: string, address2: string): string {
  return `${username.trim().toLowerCase()}::${normalizeAddressKey(zip, address1, address2)}`
}

// Keep every merged order's ID visible on the slip, oldest first.
function appendOrderId(slip: PackingSlipData, orderId: string) {
  if (!orderId || orderId === "Unknown") return
  const existing = slip.orderNumber && slip.orderNumber !== "Unknown" ? slip.orderNumber.split(", ") : []
  if (!existing.includes(orderId)) {
    slip.orderNumber = sortOrderIdsOldestFirst([...existing, orderId]).join(", ")
  }
}

// Helper function to parse weight values consistently
function parseWeight(weightValue: string | number | null | undefined): number {
  if (!weightValue) return 0

  let weightStr = String(weightValue).trim()
  if (!weightStr) return 0

  // Remove "kg" suffix (case insensitive)
  weightStr = weightStr.replace(/\s*kg\s*$/i, "")

  // Replace comma with dot for decimal parsing (European format)
  weightStr = weightStr.replace(",", ".")

  // Parse as float
  const parsed = Number.parseFloat(weightStr)
  return isNaN(parsed) ? 0 : Math.max(0, parsed) // Ensure non-negative
}

// Helper function to log detailed information about CSV processing
function logCSVDebugInfo(data: any[], columnMapping: Record<string, string>) {
  console.log("CSV Processing Debug Info:")
  console.log("Total rows:", data.length)
  console.log("Column mapping:", columnMapping)

  if (data.length > 0) {
    console.log("First row sample:", data[0])

    // Check if required fields exist in the first row
    const firstRow = data[0]
    Object.entries(columnMapping).forEach(([fieldId, columnName]) => {
      // Skip "none" values as they represent unmapped columns
      if (columnName === "none") {
        console.log(`Field '${fieldId}' is not mapped`)
        return
      }

      console.log(
        `Field '${fieldId}' mapped to column '${columnName}': ${firstRow[columnName] !== undefined ? "EXISTS" : "MISSING"}`,
      )
      if (columnName && firstRow[columnName] === undefined) {
        console.warn(`WARNING: Column '${columnName}' mapped to field '${fieldId}' does not exist in the data`)
      }
    })
  }
}

// Helper function to find a value that could be a username
function findPossibleUsername(row: any): string | null {
  // First check for common TikTok Shop username columns
  const tiktokUsernameColumns = ["Buyer Username", "buyer username", "BuyerUsername", "Username", "username"]

  for (const column of tiktokUsernameColumns) {
    if (row[column] && typeof row[column] === "string" && row[column].trim() !== "") {
      return row[column].trim()
    }
  }

  // Common patterns for usernames in various CSV formats
  const usernamePatterns = [/user/i, /buyer/i, /customer/i, /account/i]

  // Check each field in the row
  for (const [key, value] of Object.entries(row)) {
    // Skip empty values
    if (!value || typeof value !== "string" || value.trim() === "") continue

    // Check if the field name matches any username pattern
    if (usernamePatterns.some((pattern) => pattern.test(key))) {
      return value.toString().trim()
    }
  }

  // If no username field found, look for email as fallback
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === "string" && value.trim() !== "") {
      if (/email/i.test(key)) {
        return value.toString().trim()
      }
    }
  }

  return null
}

export async function processCSVWithMapping(
  csvContent: string,
  columnMapping: Record<string, string>,
): Promise<CSVProcessResult> {
  return new Promise((resolve, reject) => {
    try {
      // Clean up column mapping - replace "none" with empty string
      const cleanedMapping: Record<string, string> = {}
      for (const [key, value] of Object.entries(columnMapping)) {
        cleanedMapping[key] = value === "none" ? "" : value
      }

      // Parse the CSV content
      const results = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      })

      if (results.errors.length > 0) {
        throw new Error(`CSV parsing error: ${results.errors[0].message}`)
      }

      const data = results.data as any[]

      if (data.length === 0) {
        throw new Error("The CSV file is empty")
      }

      // Log debug information
      logCSVDebugInfo(data, cleanedMapping)

      // Product images: Supabase-backed cache first, legacy localStorage fallback
      const skuImages = readProductImagesMap()

      // Store raw CSV data for export functionality
      const rawCsvRows = [Object.keys(data[0]), ...data.map((row) => Object.values(row))]
      localStorage.setItem("rawCsvData", JSON.stringify(rawCsvRows))

      // Group orders by customer username
      const customerOrders = new Map<string, PackingSlipData>()
      let processedRows = 0
      let skippedRows = 0
      let missingUsernameRows = 0
      let invalidMappingRows = 0
      let usernameFoundInOtherField = 0

      // Check if buyerUsername field is mapped
      const buyerUsernameCol = cleanedMapping.buyerUsername

      // Log all available columns for debugging
      if (data.length > 0) {
        console.log("Available columns in CSV:", Object.keys(data[0]))
      }

      // Check for username column
      if (!buyerUsernameCol) {
        console.warn("Buyer Username field is not mapped. Will attempt to find username in data.")
      } else {
        // Check if the mapped column exists in the data
        if (data.length > 0 && data[0][buyerUsernameCol] === undefined) {
          console.error(`Mapped username column '${buyerUsernameCol}' does not exist in the data`)
        }
      }

      data.forEach((row, rowIndex) => {
        // Try to get username from the mapped column
        let username = buyerUsernameCol ? row[buyerUsernameCol] || "" : ""

        // If username is empty, try to find a possible username in other fields
        if (!username) {
          const possibleUsername = findPossibleUsername(row)
          if (possibleUsername) {
            username = possibleUsername
            usernameFoundInOtherField++
            console.log(`Row ${rowIndex + 1}: Found username '${username}' in another field`)
          }
        }

        // If still no username, generate a unique ID based on other fields
        if (!username) {
          // Try to create a unique identifier from order ID or other fields
          if (cleanedMapping.orderId && row[cleanedMapping.orderId]) {
            username = `order_${row[cleanedMapping.orderId]}`
            console.log(`Row ${rowIndex + 1}: Generated username from order ID: ${username}`)
          } else if (cleanedMapping.recipientName && row[cleanedMapping.recipientName]) {
            username = `customer_${row[cleanedMapping.recipientName].replace(/\s+/g, "_")}`
            console.log(`Row ${rowIndex + 1}: Generated username from recipient name: ${username}`)
          } else {
            // Look for Order ID in any column
            for (const [key, value] of Object.entries(row)) {
              if (/order\s*id/i.test(key) && value) {
                username = `order_${value}`
                console.log(`Row ${rowIndex + 1}: Generated username from detected Order ID column: ${username}`)
                break
              }
            }

            // If still no username, use row index
            if (!username) {
              username = `unknown_${rowIndex}`
              console.log(`Row ${rowIndex + 1}: Generated fallback username: ${username}`)
            }
          }
        }

        if (!username) {
          missingUsernameRows++
          console.warn(`Row ${rowIndex + 1}: Skipping due to missing username`)
          return // Skip rows without username
        }

        try {
          // Check if we have all required data for this row
          const requiredFields = [
            { field: "orderId", col: cleanedMapping.orderId },
            { field: "recipientName", col: cleanedMapping.recipientName },
            { field: "phoneNumber", col: cleanedMapping.phoneNumber },
            { field: "productName", col: cleanedMapping.productName },
            { field: "sku", col: cleanedMapping.sku },
            { field: "sellerSku", col: cleanedMapping.sellerSku },
            { field: "quantity", col: cleanedMapping.quantity },
            { field: "weight", col: cleanedMapping.weight },
          ]

          // Log the values for debugging
          requiredFields.forEach(({ field, col }) => {
            if (col) {
              console.log(`Row ${rowIndex + 1}: ${field} = '${row[col]}'`)
            }
          })

          // Check for missing required fields, but be more lenient
          // Only consider a field missing if it's mapped and empty
          const missingFields = requiredFields
            .filter(({ col }) => col && row[col] === undefined)
            .map(({ field }) => field)

          if (missingFields.length > 0) {
            console.warn(`Row ${rowIndex + 1}: Missing mapped fields: ${missingFields.join(", ")}`)
            invalidMappingRows++
            // Continue anyway - we'll use default values
          }

          // TikTok Shop specific: Try to find address components if not mapped
          let address = ""
          if (!cleanedMapping.addressLine1 && !cleanedMapping.addressLine2) {
            // Look for a "Shipping Information" column which often contains the full address
            for (const [key, value] of Object.entries(row)) {
              if (/shipping\s*information/i.test(key) && value) {
                address = value.toString()
                console.log(`Row ${rowIndex + 1}: Found address in Shipping Information: ${address}`)
                break
              }
            }
          }

          // Group per buyer AND per distinct shipping address
          const rowZip =
            cleanedMapping.postalCode && row[cleanedMapping.postalCode]
              ? row[cleanedMapping.postalCode]
              : row["Zipcode"] || ""
          const rowAddress1 =
            cleanedMapping.addressLine1 && row[cleanedMapping.addressLine1] ? row[cleanedMapping.addressLine1] : ""
          const rowAddress2 =
            cleanedMapping.addressLine2 && row[cleanedMapping.addressLine2] ? row[cleanedMapping.addressLine2] : ""
          const groupKey = slipGroupKey(username, rowZip, rowAddress1, rowAddress2)

          if (!customerOrders.has(groupKey)) {
            // Create new packing slip for this customer
            customerOrders.set(groupKey, {
              orderNumber:
                cleanedMapping.orderId && row[cleanedMapping.orderId]
                  ? row[cleanedMapping.orderId]
                  : row["Order ID"] || "Unknown",
              customer: {
                name:
                  cleanedMapping.recipientName && row[cleanedMapping.recipientName]
                    ? row[cleanedMapping.recipientName]
                    : row["Recipient"] || "Unknown",
                phone:
                  cleanedMapping.phoneNumber && row[cleanedMapping.phoneNumber]
                    ? row[cleanedMapping.phoneNumber]
                    : row["Phone #"] || "Unknown",
                address:
                  address ||
                  [
                    cleanedMapping.addressLine1 && row[cleanedMapping.addressLine1]
                      ? row[cleanedMapping.addressLine1]
                      : "",
                    cleanedMapping.addressLine2 && row[cleanedMapping.addressLine2]
                      ? row[cleanedMapping.addressLine2]
                      : "",
                    cleanedMapping.city && row[cleanedMapping.city] ? row[cleanedMapping.city] : row["City"] || "",
                    cleanedMapping.state && row[cleanedMapping.state]
                      ? row[cleanedMapping.state]
                      : row["Province"] || row["Autonomous Community"] || "",
                    cleanedMapping.postalCode && row[cleanedMapping.postalCode]
                      ? row[cleanedMapping.postalCode]
                      : row["Zipcode"] || "",
                  ]
                    .filter(Boolean)
                    .join(", "),
                username: username,
              },
              items: [],
              totalWeight: 0, // Initialize total weight
            })
          }

          // Get SKU for this item
          const sku = cleanedMapping.sku && row[cleanedMapping.sku] ? row[cleanedMapping.sku] : row["SKU ID"] || ""
          const sellerSku =
            cleanedMapping.sellerSku && row[cleanedMapping.sellerSku]
              ? row[cleanedMapping.sellerSku]
              : row["Seller SKU"] || ""

          const productName =
            cleanedMapping.productName && row[cleanedMapping.productName]
              ? row[cleanedMapping.productName]
              : row["Product Name"] || "Unknown Product"

          // Parse quantity, defaulting to 1 if invalid
          let quantity = 1
          if (cleanedMapping.quantity && row[cleanedMapping.quantity]) {
            const parsedQty = Number.parseInt(row[cleanedMapping.quantity], 10)
            if (!isNaN(parsedQty)) {
              quantity = parsedQty
            } else {
              console.warn(
                `Row ${rowIndex + 1}: Invalid quantity value: ${row[cleanedMapping.quantity]}. Using default of 1.`,
              )
            }
          } else if (row["Quantity"]) {
            const parsedQty = Number.parseInt(row["Quantity"], 10)
            if (!isNaN(parsedQty)) {
              quantity = parsedQty
            }
          }

          // Parse weight using the mapped column
          let itemWeight = 0
          if (cleanedMapping.weight && row[cleanedMapping.weight]) {
            itemWeight = parseWeight(row[cleanedMapping.weight])
          } else if (row["Weight(kg)"]) {
            itemWeight = parseWeight(row["Weight(kg)"])
          }

          // Add item to customer's packing slip
          const packingSlip = customerOrders.get(groupKey)!
          const itemOrderId =
            cleanedMapping.orderId && row[cleanedMapping.orderId]
              ? row[cleanedMapping.orderId]
              : row["Order ID"] || "Unknown"
          packingSlip.items.push({
            name: productName,
            sku: sku,
            sellerSku: sellerSku,
            quantity: quantity,
            weight: itemWeight,
            orderId: itemOrderId,
            // Try to find image by SKU or Seller SKU
            imageUrl: skuImages[sku] || skuImages[sellerSku] || undefined,
          })
          appendOrderId(packingSlip, itemOrderId)

          // Update total weight for the packing slip
          packingSlip.totalWeight = (packingSlip.totalWeight || 0) + itemWeight * quantity

          processedRows++
        } catch (error) {
          console.error(`Row ${rowIndex + 1}: Error processing row:`, error, row)
          skippedRows++
        }
      })

      // Log processing statistics
      console.log("CSV Processing Statistics:")
      console.log(`Total rows: ${data.length}`)
      console.log(`Processed rows: ${processedRows}`)
      console.log(`Skipped rows: ${skippedRows}`)
      console.log(`Rows with missing username: ${missingUsernameRows}`)
      console.log(`Rows with invalid mapping: ${invalidMappingRows}`)
      console.log(`Usernames found in other fields: ${usernameFoundInOtherField}`)
      console.log(`Unique customers: ${customerOrders.size}`)

      // Convert map to array
      const packingSlips = Array.from(customerOrders.values())

      if (packingSlips.length === 0) {
        const errorDetails = [
          `Total rows: ${data.length}`,
          `Processed rows: ${processedRows}`,
          `Skipped rows: ${skippedRows}`,
          `Rows with missing username: ${missingUsernameRows}`,
          `Rows with invalid mapping: ${invalidMappingRows}`,
          `Usernames found in other fields: ${usernameFoundInOtherField}`,
        ].join("\n")

        throw new Error(
          `No valid orders found in the CSV. Please check your column mappings and ensure the CSV contains valid order data.\n\nDetails:\n${errorDetails}`,
        )
      }

      resolve({
        success: true,
        data: packingSlips,
      })
    } catch (error) {
      console.error("CSV processing error:", error)
      reject(error)
    }
  })
}

export async function processCSV(file: File): Promise<CSVProcessResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error(`CSV parsing error: ${results.errors[0].message}`)
          }

          const data = results.data as any[]

          if (data.length === 0) {
            throw new Error("The CSV file is empty")
          }

          // Log the first row to help with debugging
          console.log("CSV First Row Sample:", data[0])
          console.log("Available columns:", Object.keys(data[0]))

          // Store raw CSV data for export functionality
          const rawCsvRows = [Object.keys(data[0]), ...data.map((row) => Object.values(row))]
          localStorage.setItem("rawCsvData", JSON.stringify(rawCsvRows))

          // Check if the CSV has the required columns
          const requiredColumns = [
            "Order ID", // Column 1
            "SKU ID", // Column 6
            "Seller SKU", // Column 7
            "Product Name", // Column 8
            "Quantity", // Column 10
            "Buyer Username", // Column 38
            "Recipient", // Column 41
            "Phone #", // Column 42
          ]

          // Get all column headers from the CSV
          const csvHeaders = Object.keys(data[0]).map((header) => header.trim())

          // Function to check if a required column exists in the CSV headers
          const columnExists = (requiredCol: string) => {
            // Try exact match first
            if (csvHeaders.includes(requiredCol)) {
              return true
            }

            // Try case-insensitive match
            const lowerCaseCol = requiredCol.toLowerCase()
            const lowerCaseHeaders = csvHeaders.map((h) => h.toLowerCase())
            if (lowerCaseHeaders.includes(lowerCaseCol)) {
              return true
            }

            // Try partial match (header contains the required column)
            return csvHeaders.some(
              (header) => header.toLowerCase().includes(lowerCaseCol) || lowerCaseCol.includes(header.toLowerCase()),
            )
          }

          // Check if all required columns exist
          const missingColumns = requiredColumns.filter((col) => !columnExists(col))

          if (missingColumns.length > 0) {
            throw new Error(
              `Missing required columns: ${missingColumns.join(", ")}\n\nAvailable columns: ${csvHeaders.join(", ")}`,
            )
          }

          // Product images: Supabase-backed cache first, legacy localStorage fallback
          const skuImages = readProductImagesMap()

          // Group orders by customer username
          const customerOrders = new Map<string, PackingSlipData>()
          let processedRows = 0
          let skippedRows = 0
          let missingUsernameRows = 0

          // Helper function to find the best matching column
          const findColumn = (targetCol: string) => {
            // Try exact match first
            if (csvHeaders.includes(targetCol)) {
              return targetCol
            }

            // Try case-insensitive match
            const lowerCaseTarget = targetCol.toLowerCase()
            for (const header of csvHeaders) {
              if (header.toLowerCase() === lowerCaseTarget) {
                return header
              }
            }

            // Try partial match
            for (const header of csvHeaders) {
              if (header.toLowerCase().includes(lowerCaseTarget) || lowerCaseTarget.includes(header.toLowerCase())) {
                return header
              }
            }

            return null
          }

          // Find the best matching columns
          const buyerUsernameCol = findColumn("Buyer Username")
          const orderIdCol = findColumn("Order ID")
          const recipientNameCol = findColumn("Recipient")
          const phoneNumberCol = findColumn("Phone #")
          const addressLine1Col = findColumn("Street Name")
          const addressLine2Col = findColumn("House Name or Number")
          const cityCol = findColumn("City")
          const stateCol = findColumn("Province") || findColumn("Autonomous Community")
          const postalCodeCol = findColumn("Zipcode")
          const skuCol = findColumn("SKU ID")
          const sellerSkuCol = findColumn("Seller SKU")
          const productNameCol = findColumn("Product Name")
          const quantityCol = findColumn("Quantity")
          const weightCol = findColumn("Weight(kg)") || findColumn("Weight")
          const shippingInfoCol = findColumn("Shipping Information")

          // Log the column mappings for debugging
          console.log("Column Mappings:", {
            buyerUsername: buyerUsernameCol,
            orderId: orderIdCol,
            recipientName: recipientNameCol,
            phoneNumber: phoneNumberCol,
            addressLine1: addressLine1Col,
            addressLine2: addressLine2Col,
            city: cityCol,
            state: stateCol,
            postalCode: postalCodeCol,
            sku: skuCol,
            sellerSku: sellerSkuCol,
            productName: productNameCol,
            quantity: quantityCol,
            weight: weightCol,
            shippingInfo: shippingInfoCol,
          })

          data.forEach((row, rowIndex) => {
            // Try to get username from the mapped column
            let username = buyerUsernameCol ? row[buyerUsernameCol] || "" : ""

            // If username is empty, try to find a possible username in other fields
            if (!username) {
              const possibleUsername = findPossibleUsername(row)
              if (possibleUsername) {
                username = possibleUsername
                console.log(`Row ${rowIndex + 1}: Found username '${username}' in another field`)
              }
            }

            // If still no username, generate a unique ID based on other fields
            if (!username) {
              // Try to create a unique identifier from order ID or other fields
              if (orderIdCol && row[orderIdCol]) {
                username = `order_${row[orderIdCol]}`
                console.log(`Row ${rowIndex + 1}: Generated username from order ID: ${username}`)
              } else if (recipientNameCol && row[recipientNameCol]) {
                username = `customer_${row[recipientNameCol].replace(/\s+/g, "_")}`
                console.log(`Row ${rowIndex + 1}: Generated username from recipient name: ${username}`)
              } else {
                username = `unknown_${rowIndex}`
                console.log(`Row ${rowIndex + 1}: Generated fallback username: ${username}`)
              }
            }

            if (!username) {
              missingUsernameRows++
              console.warn(`Row ${rowIndex + 1}: Skipping due to missing username`)
              return // Skip rows without username
            }

            try {
              // Get address from shipping information if available
              let address = ""
              if (shippingInfoCol && row[shippingInfoCol]) {
                address = row[shippingInfoCol]
              } else {
                address = [
                  addressLine2Col ? row[addressLine2Col] || "" : "",
                  addressLine1Col ? row[addressLine1Col] || "" : "",
                  cityCol ? row[cityCol] || "" : "",
                  postalCodeCol ? row[postalCodeCol] || "" : "",
                  stateCol ? row[stateCol] || "" : "",
                ]
                  .filter(Boolean)
                  .join(", ")
              }

              // Group per buyer AND per distinct shipping address
              const groupKey = slipGroupKey(
                username,
                postalCodeCol ? row[postalCodeCol] || "" : "",
                addressLine1Col ? row[addressLine1Col] || "" : "",
                addressLine2Col ? row[addressLine2Col] || "" : "",
              )

              if (!customerOrders.has(groupKey)) {
                // Create new packing slip for this customer
                customerOrders.set(groupKey, {
                  orderNumber: orderIdCol ? row[orderIdCol] || "Unknown" : "Unknown",
                  customer: {
                    name: recipientNameCol ? row[recipientNameCol] || "Unknown" : "Unknown",
                    phone: phoneNumberCol ? row[phoneNumberCol] || "Unknown" : "Unknown",
                    address: address,
                    username: username,
                  },
                  items: [],
                  totalWeight: 0, // Initialize total weight
                })
              }

              // Get SKU for this item
              const sku = skuCol ? row[skuCol] || "" : ""
              const sellerSku = sellerSkuCol ? row[sellerSkuCol] || "" : ""
              const productName = productNameCol ? row[productNameCol] || "Unknown Product" : "Unknown Product"

              // Parse quantity, defaulting to 1 if invalid
              let quantity = 1
              if (quantityCol && row[quantityCol]) {
                const parsedQty = Number.parseInt(row[quantityCol], 10)
                if (!isNaN(parsedQty)) {
                  quantity = parsedQty
                }
              }

              // Parse weight using consistent function
              const itemWeight = weightCol ? parseWeight(row[weightCol]) : 0

              // Add item to customer's packing slip
              const packingSlip = customerOrders.get(groupKey)!
              const itemOrderId = orderIdCol ? row[orderIdCol] || "Unknown" : "Unknown"
              packingSlip.items.push({
                name: productName,
                sku: sku,
                sellerSku: sellerSku,
                quantity: quantity,
                weight: itemWeight,
                orderId: itemOrderId,
                // Try to find image by SKU or Seller SKU
                imageUrl: skuImages[sku] || skuImages[sellerSku] || undefined,
              })
              appendOrderId(packingSlip, itemOrderId)

              // Update total weight for the packing slip
              packingSlip.totalWeight = (packingSlip.totalWeight || 0) + itemWeight * quantity

              processedRows++
            } catch (error) {
              console.error(`Row ${rowIndex + 1}: Error processing row:`, error, row)
              skippedRows++
            }
          })

          // Log processing statistics
          console.log("CSV Processing Statistics:")
          console.log(`Total rows: ${data.length}`)
          console.log(`Processed rows: ${processedRows}`)
          console.log(`Skipped rows: ${skippedRows}`)
          console.log(`Rows with missing username: ${missingUsernameRows}`)
          console.log(`Unique customers: ${customerOrders.size}`)

          // Convert map to array
          const packingSlips = Array.from(customerOrders.values())

          if (packingSlips.length === 0) {
            throw new Error(
              "No valid orders found in the CSV. Please check your CSV format and ensure it contains valid order data.",
            )
          }

          resolve({
            success: true,
            data: packingSlips,
          })
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      },
    })
  })
}
