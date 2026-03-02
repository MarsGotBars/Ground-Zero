const windowCtx = window;
const initialHeight = windowCtx.innerHeight;
let windowHeight = initialHeight;

window.addEventListener("resize", () => {
  if (initialHeight === windowCtx.innerHeight) {
    return;
  }
  windowHeight = windowCtx.innerHeight;
  console.log("resizing");
});
