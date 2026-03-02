#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Component templates
const templates = {
  atom: {
    liquid: `<div class="{{ componentName }}">
  {{ content | default: "{{ componentName }} content" }}
</div>`,
    css: `@scope (.{{ componentName }}) {
    :scope {

    }
}`
  },
  
  molecule: {
    liquid: `<div class="{{ componentName }}">
  <!-- Add your molecule structure here -->
  {{ content | default: "{{ componentName }} molecule" }}
</div>`,
    css: `@scope (.{{ componentName }}) {
    :scope {

    }
}`
  },
  
  organism: {
    liquid: `<section class="{{ componentName }}">
  <!-- Add your organism structure here -->
  {{ content | default: "{{ componentName }} organism" }}
</section>`,
    css: `@scope (.{{ componentName }}) {
    :scope {

    }
}`
  }
};

async function createComponent(componentPath) {
  if (!componentPath) {
    console.error('❌ Please provide a component path: pnpm component molecule/Button');
    process.exit(1);
  }

  const parts = componentPath.split('/');
  let componentType, componentName;
  
  if (parts.length === 1) {
    // Default to molecule if no type specified
    componentType = 'molecule';
    componentName = parts[0];
  } else {
    componentType = parts[0];
    componentName = parts[parts.length - 1];
  }

  // Validate component type
  if (!templates[componentType]) {
    console.error(`❌ Invalid component type "${componentType}". Available: atom, molecule, organism`);
    process.exit(1);
  }

  // Create paths
  const componentDir = path.join(projectRoot, 'views/partials', componentPath);
  const componentFile = path.join(componentDir, `${componentName}.liquid`);
  const cssDir = path.join(projectRoot, 'public/styles/modules');
  const cssFile = path.join(cssDir, `${componentName}.css`);
  
  try {
    // Check if component already exists
    try {
      await fs.access(componentFile);
      console.error(`❌ Component already exists: ${componentPath}`);
      process.exit(1);
    } catch {
      // Good, component doesn't exist
    }

    // Create component directory
    await fs.mkdir(componentDir, { recursive: true });
    
    // Create CSS directory if it doesn't exist
    await fs.mkdir(cssDir, { recursive: true });

    // Generate template data
    const templateData = {
      componentName,
      componentType,
      relativePath: componentPath
    };

    // Create component file
    const liquidContent = templates[componentType].liquid
      .replace(/\{\{ componentName \}\}/g, componentName)
      .replace(/\{\{ relativePath \}\}/g, componentPath);
    
    await fs.writeFile(componentFile, liquidContent);

    // Create CSS file
    const cssContent = templates[componentType].css
      .replace(/\{\{ componentName \}\}/g, componentName);
    
    await fs.writeFile(cssFile, cssContent);

    // Success message
    console.log(`✅ Created component: ${componentName}`);
    console.log(`📁 Liquid: views/partials/${componentPath}/${componentName}.liquid`);
    console.log(`🎨 CSS: public/styles/modules/${componentName}.css`);
    console.log(`\n📖 Usage:`);
    console.log(`{% render '${componentPath}/${componentName}' %}`);
    
    if (componentType !== 'atom') {
      console.log(`{% render '${componentPath}/${componentName}', data: yourData %}`);
    }

  } catch (error) {
    console.error('❌ Error creating component:', error.message);
    process.exit(1);
  }
}

// Get component path from command line arguments
const componentPath = process.argv[2];
createComponent(componentPath);