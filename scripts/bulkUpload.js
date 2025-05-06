// server/scripts/bulkUpload.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import TechStack from '../models/TechStack.js';

// Load environment variables
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => {
  console.log('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

/**
 * Processes a CSV file into a format suitable for the TechStack model
 * @param {string} filePath - Path to the CSV file
 * @param {string} techStackName - Name for the tech stack
 * @param {string} description - Description for the tech stack
 */
const processCSVFile = async (filePath, techStackName, description = '') => {
  try {
    // Read the CSV file
    const csvText = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV
    const { data } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as string to preserve newlines
      transformHeader: header => header.trim() // Trim whitespace from headers
    });
    
    console.log(`📊 Processing ${data.length} rows from CSV file...`);
    
    // Get the header names
    const headers = Object.keys(data[0] || {});
    
    // Find the relevant columns
    const columnMappings = {
      topic: ['topics', 'topic', 'technology'],
      subtopic: ['sub-topics', 'subtopics', 'sub-topic', 'subtopic'],
      project: ['project/app to build', 'projects', 'projects/apps built'],
      status: ['status of completion', 'status', 'completion status']
    };
    
    // Map raw headers to our expected names and store original header names
    const headerMapping = {};
    // Store the original header names for display
    const customHeaders = {
      topic: "Topic",
      subTopics: "Sub-Topics",
      projects: "Projects",
      status: "Status"
    };
    
    for (const [key, alternatives] of Object.entries(columnMappings)) {
      const matchedHeader = headers.find(h => 
        alternatives.some(alt => 
          h.toLowerCase().includes(alt.toLowerCase())
        )
      );
      
      if (matchedHeader) {
        headerMapping[key] = matchedHeader;
        // Store the original header name for display
        if (key === 'topic') customHeaders.topic = matchedHeader;
        else if (key === 'subtopic') customHeaders.subTopics = matchedHeader;
        else if (key === 'project') customHeaders.projects = matchedHeader;
        else if (key === 'status') customHeaders.status = matchedHeader;
      }
    }
    
    // Check if we have the required topic column
    if (!headerMapping.topic) {
      throw new Error('CSV must have a column for Topics');
    }
    
    // Initialize storage for aggregated data
    const topicsMap = new Map();
    
    // Process each row
    data.forEach(row => {
      const topic = row[headerMapping.topic];
      if (!topic) return; // Skip rows without a topic
      
      let subTopics = [];
      if (headerMapping.subtopic && row[headerMapping.subtopic]) {
        // Split subtopics by newlines and filter out empty lines
        subTopics = row[headerMapping.subtopic]
          .split(/\r?\n/)
          .map(s => s.trim())
          .filter(s => s)
          .map(name => ({ name }));
      }
      
      let projects = [];
      if (headerMapping.project && row[headerMapping.project]) {
        // If project contains newlines, split it, otherwise use as is
        if (row[headerMapping.project].includes('\n')) {
          projects = row[headerMapping.project]
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(s => s)
            .map(name => ({ name }));
        } else {
          projects = [{ name: row[headerMapping.project].trim() }];
        }
      }
      
      let status = 'Yet to Start';
      if (headerMapping.status && row[headerMapping.status]) {
        status = normalizeStatus(row[headerMapping.status]);
      }
      
      // Add or update topic in the map
      if (!topicsMap.has(topic)) {
        topicsMap.set(topic, {
          topic,
          subTopics,
          projects,
          completionStatus: status
        });
      } else {
        // For duplicate topics, merge the data
        const existingItem = topicsMap.get(topic);
        
        // Merge subtopics
        subTopics.forEach(subtopic => {
          if (!existingItem.subTopics.some(s => s.name === subtopic.name)) {
            existingItem.subTopics.push(subtopic);
          }
        });
        
        // Merge projects
        projects.forEach(project => {
          if (!existingItem.projects.some(p => p.name === project.name)) {
            existingItem.projects.push(project);
          }
        });
        
        // Update status with highest priority (Completed > In Progress > Yet to Start)
        if (status === 'Completed' || 
            (status === 'In Progress' && existingItem.completionStatus !== 'Completed')) {
          existingItem.completionStatus = status;
        }
      }
    });
    
    // Convert map to array
    const roadmapItems = Array.from(topicsMap.values());
    
    console.log(`✅ Processed ${roadmapItems.length} unique topics from CSV.`);
    
    // Create tech stack object with custom headers
    const techStackData = {
      name: techStackName,
      description,
      headers: customHeaders, // Add the custom headers
      roadmapItems
    };
    
    // Check if tech stack already exists
    const existingTechStack = await TechStack.findOne({ name: techStackName });
    
    if (existingTechStack) {
      console.log(`⚠️ Tech stack "${techStackName}" already exists. Updating its roadmap items...`);
      existingTechStack.description = description;
      existingTechStack.roadmapItems = roadmapItems;
      existingTechStack.headers = customHeaders; // Update headers
      await existingTechStack.save();
      console.log(`✅ Tech stack "${techStackName}" updated with ${roadmapItems.length} roadmap items.`);
    } else {
      // Create new tech stack
      const newTechStack = new TechStack(techStackData);
      await newTechStack.save();
      console.log(`✅ Tech stack "${techStackName}" created with ${roadmapItems.length} roadmap items.`);
    }
    
    return techStackData;
  } catch (error) {
    console.error('❌ Error processing CSV:', error);
    throw error;
  }
};

/**
 * Find a column by possible names (case-insensitive)
 * @param {Array} headers - Array of header names
 * @param {Array} possibleNames - Array of possible column names
 * @returns {string|null} - Matching header name or null
 */
const findColumn = (headers, possibleNames) => {
  for (const header of headers) {
    const headerLower = header.toLowerCase();
    if (possibleNames.some(name => headerLower.includes(name.toLowerCase()))) {
      return header;
    }
  }
  return null;
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
// ... (processDirectory, main, etc.)

/**
 * Processes all CSV files in a directory and creates tech stacks
 * @param {string} directoryPath - Path to the directory containing CSV files
 */
const processDirectory = async (directoryPath) => {
  try {
    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);
    
    // Filter for CSV files
    const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv');
    
    console.log(`📁 Found ${csvFiles.length} CSV files in ${directoryPath}`);
    
    // Process each CSV file
    for (const csvFile of csvFiles) {
      const filePath = path.join(directoryPath, csvFile);
      
      // Use filename without extension as tech stack name
      const techStackName = path.basename(csvFile, '.csv');
      
      console.log(`🔄 Processing "${techStackName}" from ${csvFile}...`);
      
      try {
        await processCSVFile(filePath, techStackName);
      } catch (error) {
        console.error(`❌ Error processing ${csvFile}:`, error);
      }
    }
    
    console.log('✅ All CSV files processed successfully.');
  } catch (error) {
    console.error('❌ Error reading directory:', error);
  }
};

/**
 * Main function to run the script
 */
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  1. Process a single CSV file:
     node bulkUpload.js --file path/to/file.csv --name "Tech Stack Name" [--description "Optional description"]
  
  2. Process all CSV files in a directory:
     node bulkUpload.js --dir path/to/directory
     
  Note: When using --dir, each CSV filename (without extension) will be used as the tech stack name.
`);
    process.exit(0);
  }
  
  try {
    if (args.includes('--file')) {
      const fileIndex = args.indexOf('--file');
      const nameIndex = args.indexOf('--name');
      const descIndex = args.indexOf('--description');
      
      if (fileIndex === -1 || nameIndex === -1 || fileIndex + 1 >= args.length || nameIndex + 1 >= args.length) {
        console.error('❌ Missing required parameters. Use --file and --name.');
        process.exit(1);
      }
      
      const filePath = args[fileIndex + 1];
      const techStackName = args[nameIndex + 1];
      const description = descIndex !== -1 && descIndex + 1 < args.length ? args[descIndex + 1] : '';
      
      await processCSVFile(filePath, techStackName, description);
    } else if (args.includes('--dir')) {
      const dirIndex = args.indexOf('--dir');
      
      if (dirIndex === -1 || dirIndex + 1 >= args.length) {
        console.error('❌ Missing directory path. Use --dir path/to/directory.');
        process.exit(1);
      }
      
      const directoryPath = args[dirIndex + 1];
      await processDirectory(directoryPath);
    } else {
      console.error('❌ Invalid parameters. Use --file or --dir.');
      process.exit(1);
    }
    
    console.log('✅ Bulk upload completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during bulk upload:', error);
    process.exit(1);
  }
};

// Run the main function
main();