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

    // Validate GitHub token exists
    if (!GITHUB_TOKEN) {
      console.error('GitHub token is missing');
      return res.status(500).json({
        success: false,
        error: 'GitHub authentication token is missing. Please check your environment variables.'
      });
    }
    
    // Headers for GitHub API requests with fresh token
    const headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    
    // Check if file already exists
    let sha;
    try {
      const checkFileUrl = `${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
      console.log(`Checking if file exists at: ${checkFileUrl}`);
      
      const response = await fetch(checkFileUrl, {
        method: 'GET',
        headers
      });
      
      if (response.status === 200) {
        const data = await response.json();
        sha = data.sha;
        console.log(`File exists, got SHA: ${sha}`);
      }
    } catch (error) {
      console.log('File does not exist yet, creating new file');
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
    
    // Log upload attempt
    const uploadUrl = `${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`;
    console.log(`Uploading to: ${uploadUrl}`);
    
    // Upload or update the file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    // Handle response
    if (uploadResponse.status !== 201 && uploadResponse.status !== 200) {
      const errorData = await uploadResponse.json();
      console.error('GitHub API error details:', errorData);
      throw new Error(`Failed to upload file: ${errorData.message}`);
    }
    
    const responseData = await uploadResponse.json();
    console.log('Upload successful, got response:', responseData.content?.html_url);
    
    // Construct the published URL - use GitHub Pages URL structure
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
      error: error.message || 'Failed to upload roadmap to GitHub'
    });
  }
};

// Get all published roadmaps
export const getPublishedRoadmaps = async (req, res) => {
  try {
    // Validate GitHub token exists
    if (!GITHUB_TOKEN) {
      console.error('GitHub token is missing');
      return res.status(500).json({
        success: false,
        error: 'GitHub authentication token is missing. Please check your environment variables.'
      });
    }
    
    // Headers for GitHub API requests with fresh token
    const headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    
    // Get the contents of the repository
    const repoUrl = `${GITHUB_API_URL}/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/`;
    console.log(`Fetching repository contents from: ${repoUrl}`);
    
    const response = await fetch(repoUrl, {
      method: 'GET',
      headers
    });
    
    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('GitHub API error details:', errorData);
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
      error: error.message || 'Failed to fetch published roadmaps'
    });
  }
};
