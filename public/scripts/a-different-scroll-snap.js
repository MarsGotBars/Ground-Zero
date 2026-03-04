const windowCtx = window;
const initialHeight = windowCtx.innerHeight;
let windowHeight = initialHeight;
console.log('hi');

window.addEventListener("resize", () => {
  if (initialHeight === windowCtx.innerHeight) {
    return;
  }
  windowHeight = windowCtx.innerHeight;
  console.log("resizing");
});
