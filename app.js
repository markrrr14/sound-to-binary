function syncPair(numId, rangeId, fmt) {
  var num = document.getElementById(numId);
  var range = document.getElementById(rangeId);
  if (!num || !range) return;
  num.addEventListener("input", function() {
    range.value = num.value;
    convert();
  });
  range.addEventListener("input", function() {
    num.value = range.value;
    convert();
  });
}

function updateBadges(freqText, ampText, sampText, bitsText) {
  document.getElementById("freqVal").textContent = freqText + " Hz";
  document.getElementById("ampVal").textContent = ampText;
  document.getElementById("samplesVal").textContent = sampText + " samples";
  document.getElementById("bitsVal").textContent = bitsText + " bits";
  var fr = document.getElementById("freqRange");
  var ar = document.getElementById("ampRange");
  var sr = document.getElementById("samplesRange");
  var br = document.getElementById("bitsRange");
  if (fr) fr.value = Number(freqText) || fr.value;
  if (ar) ar.value = ampText;
  if (sr) sr.value = sampText;
  if (br) br.value = bitsText;
}

function convert() {
  var freqText = document.getElementById("freq").value.trim();
  var ampText = document.getElementById("amp").value.trim();
  var sampText = document.getElementById("samples").value.trim();
  var bitsText = document.getElementById("bits").value.trim();

  var freq = Number(freqText);
  var amp = Number(ampText);
  var n = Number(sampText);
  var bits = Number(bitsText);

  var errors = [];

  if (freqText === "" || isNaN(freq) || freq <= 0) {
    errors.push("Frequency must be a number greater than 0.");
  }
  if (ampText === "" || isNaN(amp) || amp < 0 || amp > 1) {
    errors.push("Amplitude must be a number from 0 to 1.");
  }
  if (sampText === "" || !Number.isInteger(n) || n < 2 || n > 64) {
    errors.push("Samples must be a whole number from 2 to 64.");
  }
  if (bitsText === "" || !Number.isInteger(bits) || bits < 1 || bits > 8) {
    errors.push("Bits must be a whole number from 1 to 8.");
  }

  var warning = document.getElementById("warning");
  if (errors.length > 0) {
    warning.textContent = "Warning: " + errors.join(" ");
    document.getElementById("resultBody").innerHTML =
      '<tr><td colspan="5">Fix the inputs above and press Convert again.</td></tr>';
    document.getElementById("binaryResult").textContent = "-";
    document.getElementById("totalBits").textContent = "Total bits: -";
    document.getElementById("factFreq").textContent = "-";
    document.getElementById("factAmp").textContent = "-";
    document.getElementById("factPeriod").textContent = "-";
    document.getElementById("factWave").textContent = "-";
    document.getElementById("waveLabel").textContent = "Fix the inputs above to draw the wave.";
    var cc = document.getElementById("waveCanvas").getContext("2d");
    cc.clearRect(0, 0, 700, 220);
    return;
  }
  warning.textContent = "";
  updateBadges(freqText, ampText, sampText, bitsText);

  // Wave facts
  var periodMs = 1000 / freq;
  var wavelengthM = 343 / freq;

  var waveText;
  if (wavelengthM >= 1) {
    waveText = wavelengthM.toFixed(2) + " m";
  } else {
    waveText = (wavelengthM * 100).toFixed(1) + " cm";
  }

  document.getElementById("factFreq").textContent = freqText + " Hz";
  document.getElementById("factAmp").textContent = ampText;
  document.getElementById("factPeriod").textContent = periodMs.toFixed(2) + " ms";
  document.getElementById("factWave").textContent = waveText;

  // Samples loop
  var levels = Math.pow(2, bits);
  var body = "";
  var binaries = [];

  for (var i = 0; i < n; i++) {
    var time = i * periodMs / n;
    var height = amp * Math.sin(2 * Math.PI * i / n);
    var level = Math.round((height + 1) / 2 * (levels - 1));
    var bin = level.toString(2).padStart(bits, "0");
    binaries.push(bin);

    body += "<tr><td>" + (i + 1) + "</td><td>" +
      time.toFixed(2) + "</td><td>" +
      height.toFixed(2) + "</td><td>" +
      level + "</td><td>" + bin + "</td></tr>";
  }

  document.getElementById("resultBody").innerHTML = body;
  document.getElementById("binaryResult").textContent = binaries.join(" ");
  document.getElementById("totalBits").textContent = "Total bits: " + (n * bits);

  drawWave(amp, waveText, periodMs, freqText);
}

function drawWave(amp, waveText, periodMs, freqText) {
  var c = document.getElementById("waveCanvas");
  // crisp on retina
  var dpr = window.devicePixelRatio || 1;
  var W = 700, H = 220;
  if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
  var ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var midY = H / 2;
  var ampPx = (H / 2 - 28) * amp;

  // grid
  ctx.strokeStyle = "#dbe6f7";
  ctx.lineWidth = 1;
  for (var gx = 0; gx <= W; gx += 35) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (var gy = 0; gy <= H; gy += 22) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // center line (time axis)
  ctx.strokeStyle = "#8fa3c2";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(W, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // fill under wave
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(58,125,224,.30)");
  grad.addColorStop(1, "rgba(58,125,224,.04)");
  ctx.beginPath();
  for (var x = 0; x <= W; x++) {
    var y = midY - ampPx * Math.sin(2 * Math.PI * 3 * x / W);
    if (x === 0) { ctx.moveTo(x, midY); ctx.lineTo(x, y); }
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(W, midY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // draw THREE full sine waves. Each one = one wavelength.
  ctx.strokeStyle = "#1e4fa3";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (var x2 = 0; x2 <= W; x2++) {
    var y2 = midY - ampPx * Math.sin(2 * Math.PI * 3 * x2 / W);
    if (x2 === 0) ctx.moveTo(x2, y2);
    else ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.lineWidth = 1;

  var third = W / 3;
  // mark each wavelength (3 waves)
  ctx.fillStyle = "rgba(220,60,60,.9)";
  ctx.fillRect(0, 0, 3, H);
  ctx.fillRect(third - 1, 0, 3, H);
  ctx.fillRect(third * 2 - 1, 0, 3, H);
  ctx.fillRect(W - 3, 0, 3, H);

  // wavelength arrows - one per wave
  ctx.strokeStyle = "#dc3c3c";
  ctx.lineWidth = 2;
  for (var k = 0; k < 3; k++) {
    var x1 = third * k + 6, x2b = third * (k + 1) - 6;
    ctx.beginPath();
    ctx.moveTo(x1, H - 12);
    ctx.lineTo(x2b, H - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, H - 18); ctx.lineTo(x1, H - 6);
    ctx.moveTo(x2b, H - 18); ctx.lineTo(x2b, H - 6);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  ctx.fillStyle = "#16233d";
  ctx.font = "bold 13px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText("3 waves • each wavelength = " + waveText + "  (343 / " + freqText + " Hz)", W / 2, H - 28);

  // amplitude label
  if (amp > 0) {
    ctx.strokeStyle = "#1f9d63";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(46, midY);
    ctx.lineTo(46, midY - ampPx);
    ctx.stroke();
    ctx.fillStyle = "#17764b";
    ctx.font = "bold 12px Segoe UI, Arial";
    ctx.textAlign = "left";
    ctx.fillText("amp " + amp, 52, midY - ampPx / 2);
    ctx.lineWidth = 1;
  }

  document.getElementById("waveLabel").textContent =
    "Wavelength computed live from your input frequency: 343 / " + freqText +
    " Hz = " + waveText + ". Picture shows 3 full waves — each wave length is one wavelength.";
}

// Auto-run once so table is not empty on load
window.onload = function() {
  syncPair("freq", "freqRange");
  syncPair("amp", "ampRange");
  syncPair("samples", "samplesRange");
  syncPair("bits", "bitsRange");
  convert();
  document.getElementById("freq").addEventListener("input", convert);
  document.getElementById("amp").addEventListener("input", convert);
  document.getElementById("samples").addEventListener("input", convert);
  document.getElementById("bits").addEventListener("input", convert);
};

// Bonus: play tone for 1 second
function playTone() {
  var freq = Number(document.getElementById("freq").value);
  if (isNaN(freq) || freq <= 0) {
    document.getElementById("warning").textContent =
      "Warning: Frequency must be a number greater than 0.";
    return;
  }
  var ctx = new (window.AudioContext || window.webkitAudioContext)();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1);
}

function copyBinary() {
  var t = document.getElementById("binaryResult").textContent;
  if (!t || t === "-") return;
  navigator.clipboard.writeText(t).then(function() {
    var b = document.getElementById("copyBtn");
    var old = b.textContent;
    b.textContent = "✅ Copied!";
    setTimeout(function(){ b.textContent = old; }, 1200);
  });
}
