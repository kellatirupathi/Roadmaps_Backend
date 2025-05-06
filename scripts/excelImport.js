// server/scripts/excelImport.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import TechStack from '../models/TechStack.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verify MongoDB URI is loaded
if (!process.env.MONGO_URI) {
  console.error('❌ MongoDB URI not found in environment variables.');
  console.error('Please make sure your .env file exists in the server directory and contains MONGO_URI.');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => {
  console.log('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

/**
 * Process Excel file directly to the database with proper formatting
 * @param {string} filePath - Path to the Excel file
 */
const processExcelFile = async (filePath) => {
  try {
    console.log(`📊 Reading spreadsheet: ${filePath}`);
    
    // Read the workbook
    const workbook = XLSX.readFile(filePath, {
      cellStyles: true,
      cellDates: true,
      cellNF: true,
      raw: true // Get raw values to preserve newlines
    });
    
    console.log(`📑 Found ${workbook.SheetNames.length} sheets in workbook`);
    
    // Initialize counter for processed tech stacks
    let processedCount = 0;
    
    // Process each sheet as a separate tech stack
    for (const sheetName of workbook.SheetNames) {
      // Skip certain sheets if needed
      if (sheetName.toLowerCase() === 'readme' || sheetName.toLowerCase() === 'instructions') {
        console.log(`⏭️ Skipping sheet: ${sheetName}`);
        continue;
      }
      
      console.log(`🔄 Processing sheet: ${sheetName}`);
      
      // Get the worksheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON, keeping headers as the first row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: true,
        defval: ''
      });
      
      // Skip if no data or just headers
      if (jsonData.length <= 1) {
        console.log(`⚠️ Sheet ${sheetName} has no data. Skipping.`);
        continue;
      }
      
      // Get the header row (first row)
      const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
      
      // Identify column indices
      const topicIndex = headers.findIndex(h => h.toLowerCase().includes('topic') && !h.toLowerCase().includes('sub'));
      const subTopicsIndex = headers.findIndex(h => h.toLowerCase().includes('sub-topic') || h.toLowerCase().includes('subtopic'));
      const projectIndex = headers.findIndex(h => 
        h.toLowerCase().includes('project') || 
        h.toLowerCase().includes('task') || 
        h.toLowerCase().includes('app')
      );
      const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
      
      // Check required columns
      if (topicIndex === -1) {
        console.log(`⚠️ Sheet ${sheetName} is missing a Topic column. Skipping.`);
        continue;
      }
      
      // Store custom headers
      const customHeaders = {
        topic: headers[topicIndex] || "Topic",
        subTopics: headers[subTopicsIndex] || "Sub-Topics",
        projects: headers[projectIndex] || "Project / Task",
        status: headers[statusIndex] || "Status"
      };
      
      console.log(`Found headers: Topic="${customHeaders.topic}", Subtopic="${customHeaders.subTopics}", Project="${customHeaders.projects}", Status="${customHeaders.status}"`);
      
      // Group by topic to maintain the hierarchical structure
      const topicMap = new Map();
      let currentTopic = null;
      
      // Process data rows (skip header row)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // If this row has a topic value, it's a new topic
        if (row[topicIndex] && row[topicIndex].toString().trim() !== '') {
          currentTopic = row[topicIndex].toString().trim();
          
          // Initialize topic if it doesn't exist
          if (!topicMap.has(currentTopic)) {
            topicMap.set(currentTopic, {
              topic: currentTopic,
              subTopics: [],
              projects: [],
              completionStatus: row[statusIndex] ? normalizeStatus(row[statusIndex]) : 'Yet to Start'
            });
          }
        }
        
        // Skip if we haven't found a valid topic yet
        if (!currentTopic) continue;
        
        // Get the current topic object
        const topicObj = topicMap.get(currentTopic);
        
        // Process subtopics - important part to maintain line-by-line format
        if (subTopicsIndex !== -1 && row[subTopicsIndex] && row[subTopicsIndex].toString().trim() !== '') {
          // Split by line breaks to preserve multiline format
          const subtopicsText = row[subTopicsIndex].toString();
          
          // Handle subtopics that contain line breaks in the cell
          if (subtopicsText.includes('\n') || subtopicsText.includes('\r')) {
            // Split by line breaks
            const splitSubtopics = subtopicsText.split(/\r?\n/)
                                    .map(s => s.trim())
                                    .filter(s => s !== '');
            
            // Add each subtopic
            splitSubtopics.forEach(subtopic => {
              if (!topicObj.subTopics.some(s => s.name === subtopic)) {
                topicObj.subTopics.push({ name: subtopic });
              }
            });
          } else {
            // Single subtopic without line breaks
            const subtopic = subtopicsText.trim();
            if (!topicObj.subTopics.some(s => s.name === subtopic)) {
              topicObj.subTopics.push({ name: subtopic });
            }
          }
        }
        
        // Process projects
        if (projectIndex !== -1 && row[projectIndex] && row[projectIndex].toString().trim() !== '') {
          const project = row[projectIndex].toString().trim();
          if (!topicObj.projects.some(p => p.name === project)) {
            topicObj.projects.push({ name: project });
          }
        }
        
        // Update status if provided
        if (statusIndex !== -1 && row[statusIndex] && row[statusIndex].toString().trim() !== '') {
          const status = normalizeStatus(row[statusIndex]);
          // Update status with highest priority (Completed > In Progress > Yet to Start)
          if (status === 'Completed' || 
              (status === 'In Progress' && topicObj.completionStatus !== 'Completed')) {
            topicObj.completionStatus = status;
          }
        }
      }
      
      // Convert map to array of roadmap items
      const roadmapItems = Array.from(topicMap.values());
      
      console.log(`📝 Processed ${roadmapItems.length} unique topics from ${sheetName}`);
      
      // Skip if no valid roadmap items found
      if (roadmapItems.length === 0) {
        console.log(`⚠️ No valid roadmap items found in sheet ${sheetName}. Skipping.`);
        continue;
      }
      
      // Create tech stack data
      const techStackData = {
        name: sheetName,
        description: `Imported from ${path.basename(filePath)}, sheet: ${sheetName}`,
        headers: customHeaders,
        roadmapItems
      };
      
      try {
        // Check if tech stack already exists
        const existingTechStack = await TechStack.findOne({ name: sheetName });
        
        if (existingTechStack) {
          console.log(`⚠️ Tech stack "${sheetName}" already exists. Updating...`);
          existingTechStack.description = techStackData.description;
          existingTechStack.roadmapItems = roadmapItems;
          existingTechStack.headers = customHeaders;
          await existingTechStack.save();
          console.log(`✅ Tech stack "${sheetName}" updated with ${roadmapItems.length} roadmap items.`);
        } else {
          // Create new tech stack
          const newTechStack = new TechStack(techStackData);
          await newTechStack.save();
          console.log(`✅ Tech stack "${sheetName}" created with ${roadmapItems.length} roadmap items.`);
        }
        
        processedCount++;
      } catch (err) {
        console.error(`❌ Error saving tech stack "${sheetName}":`, err);
      }
    }
    
    console.log(`✅ Excel processing complete. Processed ${processedCount} tech stacks.`);
    return processedCount;
  } catch (error) {
    console.error('❌ Error processing Excel file:', error);
    throw error;
  }
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

// Parse command line arguments
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage:
  node excelImport.js --file path/to/file.xlsx
    
Example:
  node excelImport.js --file ../techstacks.xlsx
`);
    process.exit(0);
  }
  
  let filePath;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      filePath = args[i + 1];
      break;
    }
  }
  
  if (!filePath) {
    console.error('❌ No file specified. Use --file option to specify the Excel file.');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    await processExcelFile(filePath);
    console.log('✅ Excel import completed successfully.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Excel import:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the main function
main();