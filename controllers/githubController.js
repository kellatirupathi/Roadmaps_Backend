// server/controllers/githubController.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// GitHub API configuration
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Get from environment variables
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'niat-web';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Roadmaps';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Headers for GitHub API requests
const headers = {
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
};

// Upload roadmap to GitHub
export const uploadRoadmap = async (req, res) => {
  try {
    const { filename, content, description } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Filename and content are required'
      });
    }
    
    // Check if file already exists
    let sha;
    try {
      const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`, {
        method: 'GET',
        headers
      });
      
      if (response.status === 200) {
        const data = await response.json();
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, which is fine
    }
    
    // Base64 encode the content
    const encodedContent = Buffer.from(content).toString('base64');
    
    // Create the request body
    const requestBody = {
      message: description || `Upload roadmap: ${filename}`,
      content: encodedContent,
      branch: GITHUB_BRANCH
    };
    
    // If the file exists, include its SHA to update it
    if (sha) {
      requestBody.sha = sha;
    }
    
    // Upload or update the file
    const uploadResponse = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (uploadResponse.status !== 201 && uploadResponse.status !== 200) {
      const errorData = await uploadResponse.json();
      throw new Error(`Failed to upload file: ${errorData.message}`);
    }
    
    const responseData = await uploadResponse.json();
    
    // Construct the published URL
    const publishedUrl = `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}/${filename}`;
    
    res.status(201).json({
      success: true,
      data: responseData,
      html_url: publishedUrl
    });
  } catch (error) {
    console.error('GitHub Upload Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload roadmap to GitHub'
    });
  }
};

// Get all published roadmaps
export const getPublishedRoadmaps = async (req, res) => {
  try {
    // Get the contents of the repository
    const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/`, {
      method: 'GET',
      headers
    });
    
    if (response.status !== 200) {
      const errorData = await response.json();
      throw new Error(`Failed to get repository contents: ${errorData.message}`);
    }
    
    const contents = await response.json();
    
    // Filter for HTML files
    const htmlFiles = contents.filter(item => 
      item.type === 'file' && item.name.endsWith('.html')
    );
    
    // Construct published URLs
    const roadmaps = htmlFiles.map(file => ({
      name: file.name,
      url: `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}/${file.name}`,
      size: file.size,
      sha: file.sha,
      download_url: file.download_url,
      html_url: file.html_url
    }));
    
    res.status(200).json({
      success: true,
      data: roadmaps
    });
  } catch (error) {
    console.error('GitHub API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch published roadmaps'
    });
  }
};