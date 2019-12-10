const worker = new Worker("./js/worker.js");

worker.reduceColors = function(imageData, colorNum) {
  this.postMessage({
    method: "kmeans",
    args: [imageData, colorNum]
  });

  return new Promise(resolve => {
    this.onmessage = ev => {
      resolve(ev.data);
      //drawPalette(ev.data);
    };
  });
};

function rgb15to24({ r, g, b }) {
  let r1 = (r % 32) * 8;
  let g1 = (g % 32) * 8;
  let b1 = (b % 32) * 8;

  r1 += r1 / 32;
  g1 += g1 / 32;
  b1 += b1 / 32;

  return { r: r1, g: g1, b: b1 };
}

const imageCanvas = document.getElementById("image-canvas");
const colorCanvas = document.getElementById("color-canvas");

function drawPalette(palette) {
  const columnNum = palette.length > 32 ? 32 : palette.length;
  const tileSize = 12;
  colorCanvas.width = columnNum * tileSize;
  colorCanvas.height = Math.floor(palette.length / columnNum) * tileSize;
  colorCanvas.style.width = colorCanvas.width;
  colorCanvas.style.height = colorCanvas.height;

  const ctx = colorCanvas.getContext("2d");
  ctx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

  for (let i = 0; i < palette.length; i++) {
    let { r, g, b } = rgb15to24(palette[i]);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(
      Math.floor(i % columnNum) * tileSize,
      Math.floor(i / columnNum) * tileSize,
      tileSize,
      tileSize
    );
  }
}

function readImage(dataURL) {
  const image = new Image();
  image.onload = ev => {
    imageCanvas.width = image.width;
    imageCanvas.height = image.height;
    imageCanvas
      .getContext("2d")
      .drawImage(image, 0, 0, image.width, image.height);

    const imageData = imageCanvas
      .getContext("2d")
      .getImageData(0, 0, image.width, image.height);

    worker.reduceColors(imageData, 32).then(palette => drawPalette(palette));
  };
  image.src = dataURL;
}

function openFile(ev) {
  const input = ev.target;
  const reader = new FileReader();
  reader.onload = function(ev) {
    //console.log(ev);
    readImage(ev.target.result);
  };
  reader.readAsDataURL(input.files[0]);
}

document.getElementById("image-input").addEventListener("change", openFile);
