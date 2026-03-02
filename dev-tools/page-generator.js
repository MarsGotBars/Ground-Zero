#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Page templates
const templates = {
  root: {
    liquid: `---
layout: default-layout
title: "{{ title }}"
componentStyles:
  - /styles/pages/{{ pageName }}.css
---`,
    css: `.{{ pageName }} {

    }
}`
  },
  
  project: {
    liquid: `---
layout: project-layout
pageStyles:
  - /styles/pages/{{ pageName }}.css
---

<section class="{{ pageName }}">
  <h1>{{ title }}</h1>
  <!-- Add your project content here -->
</section>`,
    css: `.{{ pageName }} {

    }
}`
  },
  
  blog: {
    liquid: `---
layout: blog-layout
title: "{{ title }}"
date: "{{ date }}"
tags: blog
componentStyles:
  - /styles/pages/{{ pageName }}.css
---

<article class="{{ pageName }}">
  
</article>`,
    css: `.{{ pageName }} {
        
    }
}`
  }
};

async function createPage(pageInput) {
  if (!pageInput) {
    console.error('❌ Please provide a page specification:');
    console.error('  Root page:    pnpm page about');
    console.error('  Project page: pnpm page project/my-project');
    console.error('  Blog post:    pnpm page blog/my-blog-post');
    process.exit(1);
  }

  try {
    const parts = pageInput.split('/');
    let pageType, pageName, title;
    
    if (parts.length === 1) {
      // Root page
      pageType = 'root';
      pageName = parts[0];
      title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    } else {
      pageType = parts[0];
      pageName = parts[1];
      // Convert kebab-case to title case
      title = pageName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    // Validate page type  
    if (!templates[pageType]) {
      console.error(`❌ Invalid page type "${pageType}". Available: root, project, blog`);
      process.exit(1);
    }

    // Set up paths
    let pageDir, pageFile, cssFile;
    
    if (pageType === 'root') {
      pageDir = path.join(projectRoot, 'views');
      pageFile = path.join(pageDir, `${pageName}.liquid`);
    } else {
      pageDir = path.join(projectRoot, 'views', pageType);
      pageFile = path.join(pageDir, `${pageName}.liquid`);
    }
    
    cssFile = path.join(projectRoot, 'public', 'styles', 'pages', `${pageName}.css`);
    
    // Check if files already exist
    try {
      await fs.access(pageFile);
      console.error(`❌ Page already exists: ${pageFile}`);
      process.exit(1);
    } catch (error) {
      // File doesn't exist, which is what we want
    }

    try {
      await fs.access(cssFile);
      console.error(`❌ CSS file already exists: ${cssFile}`);
      process.exit(1);
    } catch (error) {
      // File doesn't exist, which is what we want
    }

    // Create directories
    await fs.mkdir(pageDir, { recursive: true });
    await fs.mkdir(path.dirname(cssFile), { recursive: true });

    // Generate template data
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const templateData = {
      pageName,
      title,
      date: today
    };

    // Create page file
    let liquidContent = templates[pageType].liquid;
    for (const [key, value] of Object.entries(templateData)) {
      liquidContent = liquidContent.replace(new RegExp(`\\{\\{ ${key} \\}\\}`, 'g'), value);
    }
    
    await fs.writeFile(pageFile, liquidContent);

    // Create CSS file
    let cssContent = templates[pageType].css;
    for (const [key, value] of Object.entries(templateData)) {
      cssContent = cssContent.replace(new RegExp(`\\{\\{ ${key} \\}\\}`, 'g'), value);
    }
    
    await fs.writeFile(cssFile, cssContent);

    // Success message
    console.log(`✅ Created ${pageType} page: ${title}`);
    console.log(`📄 Liquid: ${pageFile.replace(projectRoot, '')}`);
    console.log(`🎨 CSS: ${cssFile.replace(projectRoot, '')}`);
    
    // Show URL examples
    if (pageType === 'root') {
      console.log(`🌐 URL: /${pageName === 'index' ? '' : pageName}`);
    } else if (pageType === 'project') {
      console.log(`🌐 URL: /projecten/${pageName}`);
    } else if (pageType === 'blog') {
      console.log(`🌐 URL: /blog/${pageName}`);
    }

  } catch (error) {
    console.error('❌ Error creating page:', error.message);
    process.exit(1);
  }
}

// Get page specification from command line arguments
const pageInput = process.argv[2];
createPage(pageInput);
