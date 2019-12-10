console.log("Message from worker creation");
onmessage = msg => {
  if (msg.data.method === 'kruskal') {
    let [imageData, colorNum] = msg.data.args;
    const colorFreq = countColors(imageData);
    const targetPalette = kruskal(colorFreq, colorNum);

    postMessage(targetPalette);
  } else if (msg.data.method === 'kmeans') {
    let [imageData, colorNum] = msg.data.args;
    const colorFreq = countColors(imageData);
    const targetPalette = kmeans(colorFreq, colorNum);

    postMessage(targetPalette);
  }
};

function idx2rgb(idx) {
  return { 
    r: Math.floor(idx / 1024) % 32, 
    g: Math.floor(idx / 32) % 32, 
    b: Math.floor(idx) % 32
  };
}

function rgb2idx({r, g, b}) {
  return Math.floor(r) * 1024 + 
    Math.floor(g) * 32 + 
    Math.floor(b);
}

function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    (rgb1.r - rgb2.r) * (rgb1.r - rgb2.r) +
    (rgb1.g - rgb2.g) * (rgb1.g - rgb2.g) +
    (rgb1.b - rgb2.b) * (rgb1.b - rgb2.b)
  );
}

function countColors(imageData) {
  const data = imageData.data;
  const colorCount = Array.from(
    {length: Math.pow(2,15)}, 
    (d, i) => Object.assign(idx2rgb(i), {count: 0, idx: i})
  );

  for (let i = 0; i < data.length; i += 4) {
    let idx = rgb2idx({
      r: data[i] / 8,
      g: data[i+1] / 8,
      b: data[i+2] / 8
    });
    colorCount[idx].count ++; 
  }
  
  return colorCount;
}

function kmeansInitPalette(couts, num) {
  return couts
      .sort((a,b) => b.count - a.count)
      .slice(0, num);
}

function kmeans(data, target) {
  let presentColors = data
      .filter(d => d.count > 0);

  console.log('number of 15bit colors in image', presentColors.length);

  let targetPalette = kmeansInitPalette(presentColors, target);
  let iterationDiff = {
    sum: -1,
    shouldStop: function() {
      if (this.sum === -1) {
        return false;
      }
      
      return this.sum < 0.01;
    },
    recalc: function(prev, cur) {
      this.sum = 0;
      for (let i = 0; i < prev.length; i++) {
        this.sum += Math.abs(prev[i].r - cur[i].r);
        this.sum += Math.abs(prev[i].g - cur[i].g);
        this.sum += Math.abs(prev[i].b - cur[i].b);
      }
    }
  };

  let loopCounter = 0;
  while (!iterationDiff.shouldStop()) {
    let intermediatePalette = Array.from(
      {length: target}, 
      () => {return {r: 0,g: 0, b: 0, count: 0, num: 0};}
    );
    for (let j = 0; j < presentColors.length; j++) {
      let minDistance = 65536;
      let paletteIdx = -1;

      for (let i = 0; i < targetPalette.length; i++) {
        let distance = colorDistance(presentColors[i], presentColors[j]);
        if (distance < minDistance) {
          minDistance = distance;
          paletteIdx = i;
        }
      }

      const color = intermediatePalette[paletteIdx];

      color.r += presentColors[j].r;// * presentColors[j].count;
      color.g += presentColors[j].g;// * presentColors[j].count;
      color.b += presentColors[j].b;// * presentColors[j].count;
      color.count += presentColors[j].count;
      color.num ++;
    }

    intermediatePalette.forEach(c => {
      c.r /= c.num;//count;
      c.g /= c.num;//count;
      c.b /= c.num;//count;
    });

    iterationDiff.recalc(intermediatePalette, targetPalette);
    targetPalette = intermediatePalette;
    loopCounter ++;

   //if (loopCounter % 100 === 0) {
   //  console.log(loopCounter, iterationDiff.sum);
  // }
  }

  console.log('k-means iterations:', loopCounter);

  return targetPalette;
}

function kruskal(data, target) {
  let presentColors = data.filter(d => d.count > 0);
  console.log('number of 15bit colors in image', presentColors.length);

    let distances = [];
    for (let i = 0; i < presentColors.length - 1; i++) {
      for (let j = i + 1; j < presentColors.length; j++) {
        distances.push({
          d: colorDistance(presentColors[i], presentColors[j]),
          idx1: presentColors[i].idx,
          idx2: presentColors[j].idx,
          cnt: presentColors[i].count + presentColors[j].count
        });
      }
    }
    distances.sort((a, b) => {
      if (b.d === a.d) {
        return b.cnt - a.cnt;
      } else {
        return b.d - a.d;
      }
    });

    let forest = presentColors.map(d => new Set([d.idx]));

    while (forest.length > target) {
      let distance = distances.pop();
      let idx1 = forest.findIndex(s => s.has(distance.idx1));
      let idx2 = forest.findIndex(s => s.has(distance.idx2));
      if (idx1 !== idx2) {
        forest[idx2].forEach(idx => forest[idx1].add(idx));
        forest.splice(idx2, 1);
      }
    }

    let targetPalette = [];
    for (let i = 0; i < forest.length; i++) {
      const color = Array.from(forest[i]).reduce((p,c) => {
        p.r += data[c].r*data[c].count;
        p.g += data[c].g*data[c].count;
        p.b += data[c].b*data[c].count;
        p.count += data[c].count;
        
        return p;
      }, {r:0, g:0, b:0, count: 0});//.map(v => Math.round(v/sum));

      color.r = Math.round(color.r / color.count);
      color.g = Math.round(color.g / color.count);
      color.b = Math.round(color.b / color.count);

      targetPalette.push(color);
    }

    console.log('colors after reduction:', targetPalette);

  return targetPalette;
}
