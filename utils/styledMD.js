const parser = (content) => {
  
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if(frontMatterMatch) console.log(frontMatterMatch, 'matched');
};

export default parser;