// server/scripts/spreadsheetConverter.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts an Excel/Google Sheets file into multiple CSV files (one per sheet)
 * @param {string} filePath - Path to the Excel file
 * @param {string} outputDir - Directory to save CSV files
 */
const convertSheetsToCSV = (filePath, outputDir) => {
  try {
    console.log(`📊 Reading spreadsheet: ${filePath}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Read the workbook
    const workbook = XLSX.readFile(filePath, {
      cellStyles: true,
      cellDates: true,
      cellNF: true,
      raw: true // Get raw values to preserve newlines
    });
    
    console.log(`📑 Found ${workbook.SheetNames.length} sheets in workbook`);
    
    // Initialize counter for valid sheets
    let validSheetCount = 0;
    
    // Process each sheet
    workbook.SheetNames.forEach(sheetName => {
      // Skip certain sheets if needed (e.g., instruction sheets)
      if (sheetName.toLowerCase() === 'readme' || sheetName.toLowerCase() === 'instructions') {
        console.log(`⏭️ Skipping sheet: ${sheetName}`);
        return;
      }
      
      console.log(`🔄 Processing sheet: ${sheetName}`);
      
      // Get the worksheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Check if the sheet has the required columns
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      if (range.e.r < 2) { // At least 2 rows (header + data)
        console.log(`⚠️ Sheet ${sheetName} has insufficient data. Skipping.`);
        return;
      }
      
      // Convert sheet to JSON with raw values to preserve newlines
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: true,
        defval: '' // Default value for empty cells
      });
      
      // Check if we have data
      if (jsonData.length < 2) {
        console.log(`⚠️ Sheet ${sheetName} has no data. Skipping.`);
        return;
      }
      
      // Extract headers from the first row and clean them
      const headers = jsonData[0].map(header => 
        header ? header.toString().trim() : ''
      );
      
      // Find column indices for standard headers
      const topicsColIdx = findColumnIndex(headers, ['topics', 'topic', 'technology']);
      const subTopicsColIdx = findColumnIndex(headers, ['sub-topics', 'subtopics', 'sub-topic', 'subtopic']);
      const projectsColIdx = findColumnIndex(headers, ['project/app to build', 'projects', 'projects/apps built', 'application']);
      const statusColIdx = findColumnIndex(headers, ['status of completion', 'status', 'completion']);
      
      // Check if we have the required topics column
      if (topicsColIdx === -1) {
        console.log(`⚠️ Sheet ${sheetName} is missing a Topics column. Skipping.`);
        return;
      }
      
      // Get the actual header names for custom headers
      const customHeaders = {
        topic: headers[topicsColIdx] || "Topic",
        subTopics: subTopicsColIdx !== -1 ? headers[subTopicsColIdx] : "Sub-Topics",
        projects: projectsColIdx !== -1 ? headers[projectsColIdx] : "Projects",
        status: statusColIdx !== -1 ? headers[statusColIdx] : "Status"
      };
      
      // Create a headers row using custom headers - important for dynamically using the original headers
      const headerRow = [
        customHeaders.topic,
        customHeaders.subTopics,
        customHeaders.projects,
        customHeaders.status
      ];
      
      // Prepare the standardized CSV data
      const csvData = [];
      
      // Add the custom header row
      csvData.push(headerRow);
      
      // Process data rows
      for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];
        if (!row[topicsColIdx]) continue; // Skip rows without a topic
        
        // Create a new row with standard columns
        const newRow = [
          row[topicsColIdx] || '',
          subTopicsColIdx !== -1 ? row[subTopicsColIdx] || '' : '',
          projectsColIdx !== -1 ? row[projectsColIdx] || '' : '',
          statusColIdx !== -1 ? normalizeStatus(row[statusColIdx] || '') : 'Yet to Start'
        ];
        
        csvData.push(newRow);
      }
      
      // Skip if no data rows found
      if (csvData.length <= 1) {
        console.log(`⚠️ Sheet ${sheetName} has no valid data rows. Skipping.`);
        return;
      }
      
      // Convert data to CSV, preserving newlines within cells
      const csvContent = csvData.map(row => 
        row.map(cell => {
          // Escape commas, quotes and preserve newlines
          if (cell === null || cell === undefined) return '';
          const cellStr = cell.toString();
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // Sanitize sheet name for file system (remove invalid characters)
      const sanitizedSheetName = sheetName.replace(/[/\\?%*:|"<>]/g, '_');
      
      // Create file path
      const csvFilePath = path.join(outputDir, `${sanitizedSheetName}.csv`);
      
      // Write to file
      fs.writeFileSync(csvFilePath, csvContent, 'utf8');
      
      console.log(`✅ Created CSV file: ${csvFilePath} (${csvData.length - 1} data rows)`);
      validSheetCount++;
    });
    
    console.log(`✅ Conversion complete. Generated ${validSheetCount} CSV files in ${outputDir}.`);
    
    return validSheetCount;
  } catch (error) {
    console.error('❌ Error converting spreadsheet to CSV:', error);
    throw error;
  }
};

/**
 * Find column index by possible header names (case-insensitive, partial match)
 * @param {Array} headers - Array of header strings
 * @param {Array} possibleNames - Array of possible names to match
 * @returns {number} - Index of the matching column or -1 if not found
 */
const findColumnIndex = (headers, possibleNames) => {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase();
    if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
      return i;
    }
  }
  return -1;
};

/**
 * Normalize status values to standard format
 * @param {string} status - Input status
 * @returns {string} - Normalized status
 */
const normalizeStatus = (status) => {
  if (!status) return 'Yet to Start';
  
  const statusStr = status.toString().toLowerCase();
  if (statusStr.includes('complete') || statusStr.includes('done') || statusStr.includes('finish')) {
    return 'Completed';
  } else if (statusStr.includes('progress') || statusStr.includes('ongoing') || statusStr.includes('partial')) {
    return 'In Progress';
  } else {
    return 'Yet to Start';
  }
};

// Rest of the file remains unchanged

/**
 * Main function to run the script
 */
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  node spreadsheetConverter.js --file path/to/spreadsheet.xlsx --out path/to/output/directory

Options:
  --file    Path to the Excel/Google Sheets file
  --out     Directory to save the CSV files (default: ./csv-output)
`);
    process.exit(0);
  }
  
  try {
    // Parse arguments
    const fileIndex = args.indexOf('--file');
    const outIndex = args.indexOf('--out');
    
    if (fileIndex === -1 || fileIndex + 1 >= args.length) {
      console.error('❌ Missing spreadsheet file path. Use --file path/to/spreadsheet.xlsx');
      process.exit(1);
    }
    
    const filePath = args[fileIndex + 1];
    const outputDir = outIndex !== -1 && outIndex + 1 < args.length 
      ? args[outIndex + 1] 
      : path.join(__dirname, 'csv-output');
    
    // Convert sheets to CSV
    const convertedSheets = convertSheetsToCSV(filePath, outputDir);
    
    if (convertedSheets > 0) {
      console.log(`
🎉 Next steps:
1. Use the CSV files for bulk upload:
   node bulkUpload.js --dir ${outputDir}

2. Or upload individual CSV files:
   node bulkUpload.js --file ${outputDir}/sheet_name.csv --name "Tech Stack Name"
`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  }
};

// Run the main function
main();