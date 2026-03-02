export default async function (eleventyConfig) {
  // Smart CSS injection - only when dependencies actually change
  eleventyConfig.on('eleventy.before', async () => {
    try {
      const { autoInjectCSSQuiet } = await import('./dev-tools/component-bundler.js');
      await autoInjectCSSQuiet();
    } catch (error) {
      console.warn('⚠️ CSS injection failed:', error.message);
    }
  });

  eleventyConfig.addWatchTarget("public/**/**");
  eleventyConfig.addWatchTarget("views/partials/**/*.liquid"); // Watch components for dependency changes

  eleventyConfig.addPassthroughCopy({ "public/": "/" });

  const { Liquid } = await import("liquidjs");
  const engine = new Liquid({
    root: ["views/layouts", "views/partials"],
    extname: ".liquid",
  });

  eleventyConfig.setLibrary("liquid", engine);

  return {
    dir: {
      input: "views",
      includes: "partials",
      layouts: "layouts",
      data: "../_data",
      output: "dist",
    },
    templateFormats: ["liquid", "md", "html"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    passthroughFileCopy: true,
  };
}
