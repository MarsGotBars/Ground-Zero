#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';  
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * Recursively analyze component dependencies
 */
async function getComponentCSSDependencies(componentPath, analyzed = new Set()) {
  const componentName = path.basename(componentPath);
  
  // Avoid circular dependencies
  if (analyzed.has(componentPath)) {
    return [];
  }
  analyzed.add(componentPath);
  
  const dependencies = [];
  
  // Check if CSS exists for this component
  const cssPath = path.join(projectRoot, 'public/styles/modules', `${componentName}.css`);
  try {
    await fs.access(cssPath);
    dependencies.push(`/styles/modules/${componentName}.css`);
  } catch {
    // CSS file doesn't exist, that's ok
  }
  
  // Check if component file exists and scan for nested renders
  const liquidPath = path.join(projectRoot, 'views/partials', `${componentPath}.liquid`);
  try {
    const content = await fs.readFile(liquidPath, 'utf-8');
    const nestedRenders = content.match(/\{%\s*render\s+['"](.*?)['"][^%]*%\}/g) || [];
    
    for (const match of nestedRenders) {
      const nestedMatch = match.match(/['"](.*?)['"]/);
      if (nestedMatch) {
        const nestedPath = nestedMatch[1];
        const nestedDeps = await getComponentCSSDependencies(nestedPath, new Set(analyzed));
        dependencies.push(...nestedDeps);
      }
    }
  } catch {
    // Component file doesn't exist
  }
  
  return [...new Set(dependencies)]; // Remove duplicates
}

/**
 * Analyze a page and return its CSS dependencies
 */
async function analyzePageDependencies(pagePath) {
  try {
    const content = await fs.readFile(path.join(projectRoot, pagePath), 'utf-8');
    const renderMatches = content.match(/\{%\s*render\s+['"](.*?)['"][^%]*%\}/g) || [];
    
    const allDependencies = [];
    
    for (const match of renderMatches) {
      const componentMatch = match.match(/['"](.*?)['"]/);
      if (componentMatch) {
        const componentPath = componentMatch[1];
        const deps = await getComponentCSSDependencies(componentPath);
        allDependencies.push(...deps);
      }
    }
    
    return [...new Set(allDependencies)]; // Remove duplicates
  } catch (error) {
    console.error(`❌ Error analyzing ${pagePath}:`, error.message);
    return [];
  }
}

/**
 * Update page's front matter with auto-detected CSS dependencies
 */
async function injectPageCSS(pagePath, cssDependencies) {
  const fullPath = path.join(projectRoot, pagePath);
  let content = await fs.readFile(fullPath, 'utf-8');
  
  // Parse front matter
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (frontMatterMatch) {
    let frontMatter = frontMatterMatch[1];
    const bodyContent = frontMatterMatch[2];
    
    // Remove ALL existing componentStyles (fix for duplicates)
    frontMatter = frontMatter.replace(/componentStyles:[\s\S]*?(?=\n[a-zA-Z]|$)/g, '').trim();
    
    // Add componentStyles
    if (cssDependencies.length > 0) {
      frontMatter += `\ncomponentStyles:\n${cssDependencies.map(css => `  - ${css}`).join('\n')}`;
    }
    
    content = `---\n${frontMatter}\n---\n${bodyContent}`;
  } else {
    // Add front matter if it doesn't exist
    if (cssDependencies.length > 0) {
      content = `---\ncomponentStyles:\n${cssDependencies.map(css => `  - ${css}`).join('\n')}\n---\n${content}`;
    }
  }
  
  await fs.writeFile(fullPath, content);
}

/**
 * Analyze all pages for component dependencies
 */
async function analyzeDependencies() {
  console.log('🔍 Analyzing component dependencies per page...\n');
  
  // Find all page files (exclude partials)
  const pageFiles = await glob('views/**/*.liquid', { 
    cwd: projectRoot,
    ignore: 'views/partials/**'
  });
  
  const pageAnalysis = new Map();
  const allUsedComponents = new Set();

  for (const pagePath of pageFiles) {
    const dependencies = await analyzePageDependencies(pagePath);
    if (dependencies.length > 0) {
      pageAnalysis.set(pagePath, dependencies);
      dependencies.forEach(dep => allUsedComponents.add(dep));
    }
  }

  return { pageAnalysis, allUsedComponents: Array.from(allUsedComponents) };
}

/**
 * Auto-inject CSS dependencies into page front matter
 */
async function autoInjectCSS() {
  console.log('💉 Auto-injecting CSS dependencies...\n');
  
  const { pageAnalysis } = await analyzeDependencies();
  
  for (const [pagePath, dependencies] of pageAnalysis) {
    console.log(`📄 ${pagePath}:`);
    dependencies.forEach(dep => console.log(`   → ${dep}`));
    
    await injectPageCSS(pagePath, dependencies);
    console.log(`   ✅ Injected componentStyles\n`);
  }
  
  console.log('🎉 Auto-injection complete!');
}

/**
 * Auto-inject CSS dependencies into page front matter (dev mode, smart)
 */
async function autoInjectCSSQuiet() {
  const { pageAnalysis } = await analyzeDependencies();
  
  let totalPages = 0;
  let actualChanges = 0;
  
  for (const [pagePath, dependencies] of pageAnalysis) {
    const changed = await injectPageCSSIfChanged(pagePath, dependencies);
    totalPages++;
    if (changed) actualChanges++;
  }
  
  if (actualChanges > 0) {
    console.log(`Updated CSS for ${actualChanges}/${totalPages} pages`);
  }
}

/**
 * Update page's front matter only if dependencies changed
 */
async function injectPageCSSIfChanged(pagePath, cssDependencies) {
  const fullPath = path.join(projectRoot, pagePath);
  let content = await fs.readFile(fullPath, 'utf-8');
  
  // Parse existing componentStyles
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  let existingStyles = [];
  
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1];
    const stylesMatch = frontMatter.match(/componentStyles:\s*\n((?:\s*-\s*.*\n?)*)/);
    if (stylesMatch) {
      existingStyles = stylesMatch[1]
        .split('\n')
        .map(line => line.trim().replace(/^-\s*/, ''))
        .filter(line => line);
    }
  }
  
  // Check if dependencies changed
  const sortedExisting = existingStyles.sort();
  const sortedNew = [...cssDependencies].sort();
  
  if (JSON.stringify(sortedExisting) === JSON.stringify(sortedNew)) {
    return false; // No changes needed
  }
  
  // Dependencies changed, update the file
  await injectPageCSS(pagePath, cssDependencies);
  return true;
}

/**
 * Just analyze dependencies (dry run)
 */
async function analyzeDryRun(specificPage = null) {
  if (specificPage) {
    const dependencies = await analyzePageDependencies(specificPage);
    console.log(`Dependencies: [${dependencies.join(', ')}]`);
    return;
  }
  
  const { pageAnalysis } = await analyzeDependencies();
  
  console.log('📊 Component Dependencies per Page:\n');
  for (const [page, deps] of pageAnalysis) {
    console.log(`${page}:`);
    deps.forEach(dep => console.log(`   → ${dep}`));
    console.log();
  }
}

// CLI Interface and Main Function
async function main() {
  const command = process.argv[2];
  const target = process.argv[3];
  
  try {
    switch (command) {
      case 'analyze':
        await analyzeDryRun(target);
        break;
        
      case 'inject':
        await autoInjectCSS();
        console.log('\n🎯 Next step: Update your Head.liquid to use componentStyles!');
        break;

      case 'inject-quiet':
        await autoInjectCSSQuiet();
        break;
        
      case 'bundle':
        // Keep original bundle functionality
        await createLegacyBundle();
        break;
        
      default:
        console.log(`
🎯 Smart Component CSS Bundler

Per-Page Auto Injection:
  node scripts/component-bundler.js analyze          - Analyze all pages (dry run)
  node scripts/component-bundler.js analyze [page]   - Analyze specific page  
  node scripts/component-bundler.js inject           - Auto-inject CSS into front matter
  
Legacy Bundle:
  node scripts/component-bundler.js bundle           - Create global CSS bundle

Examples:
  node scripts/component-bundler.js analyze views/index.liquid
  node scripts/component-bundler.js inject
`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Legacy bundle functionality (kept for compatibility)
 */
async function createLegacyBundle() {
  console.log('📦 Creating legacy component bundle...\n');
  
  const { allUsedComponents } = await analyzeDependencies();
  let bundledCSS = '/* Auto-generated component styles */\n\n';
  const foundStyles = [];
  
  for (const cssPath of allUsedComponents) {
    const componentName = path.basename(cssPath, '.css');
    const fullPath = path.join(projectRoot, 'public', cssPath.slice(1)); // Remove leading /
    
    try {
      const cssContent = await fs.readFile(fullPath, 'utf-8');
      bundledCSS += `/* ${componentName} */\n${cssContent}\n\n`;
      foundStyles.push(cssPath);
      console.log(`✅ ${cssPath}`);
    } catch {
      console.log(`⚠️  ${cssPath} → CSS not found`);
    }
  }
  
  // Write bundled CSS
  const bundlePath = path.join(projectRoot, 'public/styles/components-bundle.css');
  await fs.writeFile(bundlePath, bundledCSS);
  
  console.log(`\n📦 Created bundle: public/styles/components-bundle.css`);
  console.log(`🎨 Bundled ${foundStyles.length} component stylesheets`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for use in Eleventy config
export { analyzePageDependencies, autoInjectCSS, autoInjectCSSQuiet, injectPageCSSIfChanged, analyzeDependencies };