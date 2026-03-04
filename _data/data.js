import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import parser from "../utils/styledMD.js";
  
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const linkage = {
   "scrollmation": {
    title: "Scrollmation",
    slug: "scrollmation",
    description: "CSS only motion on scroll!",
    status: "WIP",
    labels: ["project", "code"],
    date: "2026-03-04",
  },
  "select-your-poison": {
    title: "Select Your Poison",
    slug: "select-your-poison",
    description: "Native selects!",
    status: "Done",
    labels: ["project", "code"],
    date: "2026-02-20",
  },
  "a-different-scroll-snap": {
    title: "Alternative snapping",
    slug: "a-different-scroll-snap",
    description: "unnamed",
    status: "wip",
    labels: ["project", "code"],
    date: "2026-02-25",
  },
  "powers-combined": {
    title: "11ty + liquidJS = win",
    slug: "powers-combined",
    description: "How you can still write static HTML, without the downsides!",
    status: "upcoming",
    labels: ["code"],
    date: "2026-02-20",
  },
  "ultimate-test": {
    title: "Masonry in liquidJS?",
    slug: "ultimate-test",
    description: "How you can still write static HTML, without the downsides!",
    status: "upcoming",
    labels: ["code"],
    date: "2026-02-20",
  },
  "test-test": {
    title: "aaa in liquidJS?",
    slug: "test-test",
    description: "How you can still write static HTML, without the downsides!",
    status: "upcoming",
    labels: ["code"],
    date: "2026-02-20",
  },
};

const getMarkdown = async () => {
  let foundMarkdownData = [];
  for (const [key, _] of Object.entries(linkage)) {
    try {
      const fileName = path.basename("content.md");

      const fullPath = path.join(projectRoot, `content/${key}`, fileName);
      
      // error if path is not found
      await fs.access(fullPath);
      const data = await fs.readFile(fullPath, 'utf-8')
      console.log(data);
      
      foundMarkdownData.push(fullPath)
      const test = parser(data)
      console.log(test);
    } catch (error) {

    }
  }
  console.log(foundMarkdownData);
  
};

export default function () {
  getMarkdown();
  return {
    linkage,
  };
}
