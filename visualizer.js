class AudioVisualizer {
  constructor() {
    this.canvas = document.getElementById("visualizer");
    this.ctx = this.canvas.getContext("2d");
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.animationId = null;
    this.effects = [
      "waveform",
      "equalizer",
      "spiral",
      "circular",
      "ponds",
      "lightspeed",
      "dnahelix",
      "triangleTunnel",
      "matrixrain",
      "geometric",
      "hypercube",
      "cubearray",
      "wavegrid",
      "constellation",
      "polyhedron",
      "fractaltree",
      "floatingShapes",
      "starfield",
      "geometricWeb",
      "ribbons",
      "smoothEqualizer",
      "nebulaFlow",
      "waveTunnel",
      "freqFlower",
      "freqWeb",
      "crystalPulse",
    ];
    this.currentEffect = Math.floor(Math.random() * this.effects.length);
    this.lastEffectChange = Date.now();
    this.minDuration = 20000; // Default 20 seconds in milliseconds
    this.maxDuration = 35000; // Default 35 seconds in milliseconds
    this.changeInterval = this.getRandomInterval();
    this.textSize = Math.min(window.innerWidth, window.innerHeight) * 0.2;
    this.baseTextY = 0;
    this.lastGlitchTime = 0;
    this.glitchInterval = 100;
    this.glitchOffset = { x: 0, y: 0 };
    this.textOpacity = 1;
    this.lastTextToggle = Date.now();
    this.textToggleInterval = 3000;
    this.textScale = 1;
    this.displayText = "LVLC"; // Default text
    this.logo = {
      enabled: false,
      image: null,
      scale: 0.5,
      lastToggle: Date.now(),
      forceShow: false,
    };
    this.elementsVisible = true;
    this.loadConfig();
    this.setupCanvas();
    this.setupKeyboardControls();
    this.setupFullscreenControl();
  }

  async loadConfig() {
    try {
      const response = await fetch("config.json");
      const config = await response.json();
      // Store the entire config object
      this.config = config;
      this.displayText = config.displayText;
      this.showEffectName = config.showEffectName;
      this.showText = config.showText;
      const duration = config.effectDuration || { min: 20, max: 35 };
      this.minDuration = duration.min * 1000; // Convert to milliseconds
      this.maxDuration = duration.max * 1000;

      // Load logo configuration
      if (config.logo && config.logo.enabled) {
        this.logo.enabled = true;
        this.logo.scale = config.logo.scale || 0.5;
        const logoImage = new Image();
        logoImage.crossOrigin = "anonymous";
        logoImage.onerror = (e) => {
          console.error("Error loading logo image:", e);
          this.logo.enabled = false;
        };
        logoImage.onload = () => {
          console.log("Logo image loaded successfully");
          this.logo.image = logoImage;
        };
        const logoPath = `img/${config.logo.imageName}`;
        console.log("Loading logo from:", logoPath);
        logoImage.src = logoPath;
      }
    } catch (error) {
      console.error("Error loading config:", error);
      // Initialize default config if loading fails
      this.config = {
        glitchEffects: {
          text: {
            intensity: 1.0,
            frequency: 100,
            offsetMultiplier: 1.0,
          },
          logo: {
            intensity: 0.8,
            frequency: 100,
            offsetMultiplier: 0.8,
          },
        },
        logo: {
          visibilityInterval: {
            enabled: false,
            duration: 8000,
            hideInterval: 12000,
            lowFrequencyTrigger: {
              enabled: false,
              threshold: 180,
              sensitivity: 0.7,
            },
          },
        },
      };
    }
  }

  setupCanvas() {
    const updateDimensions = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.textSize = Math.min(window.innerWidth, window.innerHeight) * 0.1;
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        this.currentEffect =
          (this.currentEffect - 1 + this.effects.length) % this.effects.length;
        this.lastEffectChange = Date.now();
      } else if (event.key === "ArrowRight") {
        this.currentEffect = (this.currentEffect + 1) % this.effects.length;
        this.lastEffectChange = Date.now();
      } else if (event.key.toLowerCase() === "l") {
        this.elementsVisible = !this.elementsVisible;
        if (this.elementsVisible) {
          this.logo.forceShow = true;
          this.logo.lastToggle = Date.now();
        }
      }
    });
  }

  async init() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      // Ensure logo is hidden when visualization starts
      const logoContainer = document.getElementById("logoContainer");
      if (logoContainer) {
        logoContainer.classList.add("hidden");
      }
      this.animate();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  animate() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteTimeDomainData(this.dataArray);

    // Clear the canvas completely for each frame to prevent accumulation
    this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add a semi-transparent layer for trail effects where needed
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Check if it's time to change the effect
    const now = Date.now();
    if (now - this.lastEffectChange > this.changeInterval) {
      this.currentEffect = (this.currentEffect + 1) % this.effects.length;
      this.lastEffectChange = now;
      this.changeInterval = this.getRandomInterval();
    }

    // Draw the current effect
    const effectMethod = `draw${
      this.effects[this.currentEffect].charAt(0).toUpperCase() +
      this.effects[this.currentEffect].slice(1)
    }`;
    if (typeof this[effectMethod] === "function") {
      this[effectMethod]();
    }

    // Draw the bouncing text
    this.drawBouncingText();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.source) {
      this.source.disconnect();
    }
    window.removeEventListener("resize", this.updateDimensions);
  }

  getRandomInterval() {
    return (
      Math.random() * (this.maxDuration - this.minDuration) + this.minDuration
    );
  }

  drawWaveform() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const sliceWidth = width / bufferLength;
    const scaleFactor = Math.min(width, height) / 1000;
    let x = 0;

    this.ctx.lineWidth = 8 * scaleFactor;
    this.ctx.strokeStyle = `hsl(${(Date.now() * 0.05) % 360}, 100%, 50%)`;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);

    for (let i = 0; i < bufferLength; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = height / 2 + ((v - 1) * height * scaleFactor) / 2;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    this.ctx.stroke();
  }

  drawSpiral() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 667; // Increased scale by 50%

    this.ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const value = this.dataArray[i];
      const angle = (i * 2 * Math.PI) / bufferLength;
      const radius =
        value * 2.25 * scaleFactor + (i / bufferLength) * 300 * scaleFactor; // Increased radius
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      this.ctx.strokeStyle = `hsl(${(i / bufferLength) * 360}, 100%, 50%)`;
      this.ctx.lineWidth = 6 * scaleFactor; // Increased line width
    }
    this.ctx.stroke();
  }

  drawCircular() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 400; // Reduced scale factor
    const radius = Math.min(centerX, centerY) * 0.4; // Reduced base radius
    const bufferLength = this.analyser.frequencyBinCount;

    // Get frequency data for better audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for dynamic scaling
    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensityFactor = 1 + (avgFrequency / 255) * 0.3; // Reduced intensity factor

    for (let i = 0; i < bufferLength; i++) {
      const angle = (i * 2 * Math.PI) / bufferLength;
      const value = frequencyData[i];
      const barHeight = (value + 30) * scaleFactor * intensityFactor; // Reduced base height
      const barWidth = ((Math.PI * 2 * radius) / bufferLength) * 1.2; // Reduced width multiplier

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(angle);

      const gradient = this.ctx.createLinearGradient(
        0,
        radius * 0.9,
        0,
        radius + barHeight
      );
      gradient.addColorStop(
        0,
        `hsla(${(i / bufferLength) * 360}, 100%, 50%, 0.8)`
      );
      gradient.addColorStop(
        1,
        `hsla(${(i / bufferLength) * 360}, 100%, 30%, 0.6)`
      );

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, radius * 0.9, barWidth, barHeight);
      this.ctx.restore();
    }
  }

  drawEqualizer() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 1000;
    const barCount = Math.floor(bufferLength / 32);
    const barWidth = width / barCount;
    const spacing = barWidth * 0.2;

    // Initialize or update bar heights with smooth transitions
    if (!this.barHeights) {
      this.barHeights = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < 32; j++) {
        sum += this.dataArray[i * 32 + j];
      }
      const targetHeight = (sum / 32) * scaleFactor * height * 0.003;

      // Smooth transition
      this.barHeights[i] += (targetHeight - this.barHeights[i]) * 0.3;
      const barHeight = this.barHeights[i];

      // Create gradient with modern colors
      const gradient = this.ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeight
      );
      const hue = (i / barCount) * 180 + Date.now() * 0.05;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.9)`);
      gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 70%, 1.0)`);

      // Add glow effect
      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
      this.ctx.shadowBlur = 15;

      // Draw main bar
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        i * barWidth + spacing / 2,
        height - barHeight,
        barWidth - spacing,
        barHeight
      );

      // Draw reflection
      const reflectionGradient = this.ctx.createLinearGradient(
        0,
        height,
        0,
        height + barHeight * 0.4
      );
      reflectionGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.4)`);
      reflectionGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      this.ctx.fillStyle = reflectionGradient;
      this.ctx.fillRect(
        i * barWidth + spacing / 2,
        height,
        barWidth - spacing,
        barHeight * 0.4
      );

      // Reset shadow
      this.ctx.shadowBlur = 0;
    }
  } // Add closing brace here

  drawLightspeed() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 1000;

    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += frequencyData[i];
    }
    const averageFrequency = sum / bufferLength;
    const globalIntensity = averageFrequency / 255;

    const numStreaks = Math.floor(75 + globalIntensity * 75);

    for (let i = 0; i < numStreaks; i++) {
      const freqIndex = Math.floor((i * bufferLength) / numStreaks);
      const value = frequencyData[freqIndex];
      const normalizedValue = value / 255;

      const angle =
        (i / numStreaks) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);

      const baseLength = Math.max(this.canvas.width, this.canvas.height) * 0.9;
      const length = baseLength * (0.3 + normalizedValue * 0.7);

      const startDistance =
        (Math.random() * 0.4 + 0.1) * length * globalIntensity;
      const startX = centerX + Math.cos(angle) * startDistance;
      const startY = centerY + Math.sin(angle) * startDistance;

      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;

      const hue = (Date.now() * 0.05 + (i * 360) / numStreaks) % 360;
      const saturation = 100;
      const lightness = 95 + normalizedValue * 5;
      const alpha = (0.6 + normalizedValue * 0.4) * globalIntensity;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);

      this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      this.ctx.lineWidth = (2 + normalizedValue * 4) * scaleFactor;
      this.ctx.stroke();
    }
  }

  drawBouncingText() {
    if (!this.elementsVisible) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;

    const bounceOffset = (average - 128) * 0.5;
    const targetY = centerY + bounceOffset;

    this.baseTextY = this.baseTextY * 0.8 + targetY * 0.2;

    const now = Date.now();

    // Update text visibility
    if (now - this.lastTextToggle > this.textToggleInterval) {
      this.textOpacity = this.textOpacity === 1 ? 0 : 1;
      this.lastTextToggle = now;
      this.textToggleInterval = Math.random() * 2000 + 2000;
    }

    // Smoothly transition opacity
    const targetOpacity = this.textOpacity;
    this.textOpacity = this.textOpacity * 0.95 + targetOpacity * 0.05;

    // Enhanced audio-reactive scaling
    const normalizedAverage = average / 128;
    const beatIntensity = Math.pow(normalizedAverage, 3);
    const targetScale = 1 + beatIntensity * 1.5;
    this.textScale = this.textScale * 0.8 + targetScale * 0.2;

    const glitchConfig = this.config.glitchEffects.text || {
      intensity: 1.0,
      frequency: 100,
      offsetMultiplier: 1.0,
    };
    if (now - this.lastGlitchTime > glitchConfig.frequency) {
      this.glitchOffset = {
        x:
          (Math.random() - 0.5) *
          10 *
          (average / 128) *
          glitchConfig.intensity *
          glitchConfig.offsetMultiplier,
        y:
          (Math.random() - 0.5) *
          10 *
          (average / 128) *
          glitchConfig.intensity *
          glitchConfig.offsetMultiplier,
      };
      this.lastGlitchTime = now;
    }

    // Calculate tilt angle based on audio data with increased range and responsiveness
    if (!this.currentTilt) this.currentTilt = 0;
    const targetTilt = (((average - 128) / 128) * Math.PI) / 4; // Increased to ±45 degrees
    this.currentTilt = this.currentTilt * 0.7 + targetTilt * 0.3; // Increased responsiveness with faster smoothing

    this.ctx.save();
    this.ctx.translate(centerX, this.baseTextY);
    this.ctx.rotate(this.currentTilt); // Apply tilt rotation
    this.ctx.scale(this.textScale, this.textScale);
    this.ctx.translate(-centerX, -this.baseTextY);

    // Handle logo visibility based on interval and force show
    if (this.logo.enabled && this.logo.image) {
      const visibilityConfig = this.config.logo.visibilityInterval;
      const lowFreqConfig = visibilityConfig.lowFrequencyTrigger;

      // Get frequency data for low frequency detection
      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(frequencyData);

      // Calculate average of low frequencies (first quarter of frequency range)
      const lowFreqRange = Math.floor(frequencyData.length * 0.25);
      const lowFreqAvg =
        frequencyData
          .slice(0, lowFreqRange)
          .reduce((sum, val) => sum + val, 0) / lowFreqRange;

      // Detect sudden low frequency spikes
      if (!this.lastLowFreqAvg) this.lastLowFreqAvg = lowFreqAvg;
      const lowFreqDelta = lowFreqAvg - this.lastLowFreqAvg;
      this.lastLowFreqAvg = lowFreqAvg;

      // Update logo visibility based on low frequency trigger
      if (
        lowFreqConfig.enabled &&
        lowFreqDelta > lowFreqConfig.threshold * lowFreqConfig.sensitivity
      ) {
        this.logo.forceShow = true;
        this.logo.lastToggle = now;
      }

      const shouldShowByInterval = visibilityConfig.enabled
        ? (now - this.logo.lastToggle) %
            (visibilityConfig.duration + visibilityConfig.hideInterval) <
          visibilityConfig.duration
        : true;

      if (this.logo.forceShow || shouldShowByInterval) {
        const viewportScale =
          Math.min(this.canvas.width, this.canvas.height) * 0.001;
        const logoWidth =
          this.logo.image.width * this.logo.scale * viewportScale;
        const logoHeight =
          this.logo.image.height * this.logo.scale * viewportScale;

        // Set composite operation for better visibility
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 0.9 * this.textOpacity;

        // Calculate base position
        const baseX = centerX - logoWidth / 2;
        const baseY = this.baseTextY - logoHeight / 2;

        // Draw with reduced glitch effect
        // Red channel
        const logoGlitchConfig = this.config.glitchEffects.logo || {
          intensity: 0.8,
          frequency: 100,
          offsetMultiplier: 0.8,
        };
        // Red channel
        this.ctx.drawImage(
          this.logo.image,
          baseX +
            this.glitchOffset.x *
              logoGlitchConfig.intensity *
              logoGlitchConfig.offsetMultiplier,
          baseY +
            this.glitchOffset.y *
              logoGlitchConfig.intensity *
              logoGlitchConfig.offsetMultiplier,
          logoWidth,
          logoHeight
        );

        // Green channel
        this.ctx.drawImage(
          this.logo.image,
          baseX -
            this.glitchOffset.x *
              logoGlitchConfig.intensity *
              (logoGlitchConfig.offsetMultiplier * 0.5),
          baseY -
            this.glitchOffset.y *
              logoGlitchConfig.intensity *
              (logoGlitchConfig.offsetMultiplier * 0.5),
          logoWidth,
          logoHeight
        );

        // Blue channel
        this.ctx.drawImage(
          this.logo.image,
          baseX +
            this.glitchOffset.x *
              logoGlitchConfig.intensity *
              (logoGlitchConfig.offsetMultiplier * 0.75),
          baseY -
            this.glitchOffset.y *
              logoGlitchConfig.intensity *
              (logoGlitchConfig.offsetMultiplier * 0.75),
          logoWidth,
          logoHeight
        );

        // Reset composite operation and alpha
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = "source-over";
      }
    } else if (this.showText) {
      // Main text with enhanced visibility
      this.ctx.font = `bold ${this.textSize}px Impact`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Use source-over for better text visibility
      this.ctx.globalCompositeOperation = "source-over";

      // First glitch offset - Red channel
      const baseHue = (Date.now() * 0.05) % 360;
      this.ctx.fillStyle = `hsla(${baseHue}, 100%, 50%, ${
        0.9 * this.textOpacity
      })`;
      this.ctx.fillText(
        this.displayText,
        centerX + this.glitchOffset.x * 0.4,
        this.baseTextY + this.glitchOffset.y * 0.4
      );

      // Second glitch offset - Green channel
      this.ctx.fillStyle = `hsla(${(baseHue + 120) % 360}, 100%, 50%, ${
        0.9 * this.textOpacity
      })`;
      this.ctx.fillText(
        this.displayText,
        centerX - this.glitchOffset.x * 0.2,
        this.baseTextY - this.glitchOffset.y * 0.2
      );

      // Third glitch offset - Blue channel
      this.ctx.fillStyle = `hsla(${(baseHue + 240) % 360}, 100%, 50%, ${
        0.9 * this.textOpacity
      })`;
      this.ctx.fillText(
        this.displayText,
        centerX + this.glitchOffset.x * 0.2,
        this.baseTextY - this.glitchOffset.y * 0.4
      );
    }

    this.ctx.restore();

    // Reset composite operation
    this.ctx.globalCompositeOperation = "source-over";

    // Draw effect name if enabled in bottom right corner
    if (this.showEffectName) {
      const effectName = this.effects[this.currentEffect].toUpperCase();
      const padding = 20; // Padding from the edges
      this.ctx.font = `bold ${this.textSize * 0.25}px Impact`;
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "bottom";
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * this.textOpacity})`;
      this.ctx.fillText(
        effectName,
        this.canvas.width - padding,
        this.canvas.height - padding
      );
      // Reset text alignment for other text elements
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
    }
  }

  drawPonds() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 1000;

    // Get frequency data for audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for global effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    // Number of rings based on audio intensity
    const numRings = Math.floor(10 + intensity * 15);
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;

    for (let i = 0; i < numRings; i++) {
      const t = i / numRings;
      const freqIndex = Math.floor(t * bufferLength);
      const audioValue = frequencyData[freqIndex] / 255;

      // Radius that pulses with audio
      const radius = maxRadius * t * (0.8 + audioValue * 0.4);

      // Color based on audio frequency and time
      const hue = (Date.now() * 0.05 + (i * 360) / numRings) % 360;
      const saturation = 100;
      const lightness = 50 + audioValue * 30;
      const alpha = (0.8 - t * 0.6) * (0.5 + audioValue * 0.5);

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      this.ctx.lineWidth = (4 + audioValue * 4) * scaleFactor;
      this.ctx.stroke();
    }
  }

  drawDNAHelix() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 400;

    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = Math.pow(averageFrequency / 255, 1.5);

    const time = Date.now() * 0.001;
    const points = 150;
    const radius = Math.min(width, height) * 0.25;
    const verticalStretch = height * 1.5;

    // Initialize particle system if not exists
    if (!this.dnaParticles) {
      this.dnaParticles = Array(50)
        .fill()
        .map(() => ({
          x: centerX,
          y: centerY,
          size: Math.random() * 3 + 1,
          speed: Math.random() * 2 + 1,
          angle: Math.random() * Math.PI * 2,
          offset: Math.random() * Math.PI * 2,
        }));
    }

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(Math.PI / 4);
    this.ctx.translate(-centerX, -centerY);

    // Add glow effect
    this.ctx.shadowBlur = 15 * intensity;
    this.ctx.shadowColor = `hsla(${
      (time * 50) % 360
    }, 100%, 50%, ${intensity})`;

    // Draw the two helixes with enhanced effects
    for (let strand = 0; strand < 2; strand++) {
      this.ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const t = i / points;
        const angle = t * Math.PI * 6 + time * 2;
        const freqIndex = Math.floor(t * bufferLength);
        const audioValue = Math.pow(frequencyData[freqIndex] / 255, 1.2);
        const radiusOffset = radius * (1 + audioValue * 0.5);

        const x = centerX + Math.cos(angle + strand * Math.PI) * radiusOffset;
        const y =
          centerY +
          (t - 0.5) * verticalStretch +
          Math.sin(angle * 2) * 15 * intensity;

        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);

        // Add particles along the helix
        if (Math.random() < 0.1 * intensity) {
          this.dnaParticles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1,
            angle: Math.random() * Math.PI * 2,
            offset: Math.random() * Math.PI * 2,
          });
        }
      }

      // Dynamic color gradient based on audio and time
      const gradient = this.ctx.createLinearGradient(
        centerX - radius,
        centerY,
        centerX + radius,
        centerY
      );
      const hue1 = (time * 50 + strand * 180) % 360;
      const hue2 = (hue1 + 60) % 360;
      gradient.addColorStop(
        0,
        `hsla(${hue1}, 100%, 50%, ${0.7 + intensity * 0.3})`
      );
      gradient.addColorStop(
        1,
        `hsla(${hue2}, 100%, 50%, ${0.7 + intensity * 0.3})`
      );

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (3 + intensity * 4) * scaleFactor;
      this.ctx.stroke();

      // Draw enhanced base pairs
      if (strand === 0) {
        for (let i = 0; i < points; i += 5) {
          const t = i / points;
          const angle = t * Math.PI * 6 + time * 2;
          const freqIndex = Math.floor(t * bufferLength);
          const audioValue = Math.pow(frequencyData[freqIndex] / 255, 1.2);
          const radiusOffset = radius * (1 + audioValue * 0.5);

          const x1 = centerX + Math.cos(angle) * radiusOffset;
          const y1 =
            centerY +
            (t - 0.5) * verticalStretch +
            Math.sin(angle * 2) * 15 * intensity;
          const x2 = centerX + Math.cos(angle + Math.PI) * radiusOffset;
          const y2 = y1;

          // Animated base pairs with glow
          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          const cp1x = (x1 + x2) / 2;
          const cp1y =
            y1 - 10 * Math.sin(time * 3 + t * Math.PI * 2) * intensity;
          this.ctx.quadraticCurveTo(cp1x, cp1y, x2, y2);

          const baseHue = (t * 360 + time * 50) % 360;
          this.ctx.strokeStyle = `hsla(${baseHue}, 100%, 50%, ${
            0.5 + audioValue * 0.5
          })`;
          this.ctx.lineWidth = (1 + audioValue * 2) * scaleFactor;
          this.ctx.stroke();
        }
      }
    }

    // Update and draw particles
    this.dnaParticles = this.dnaParticles.filter((particle) => {
      particle.x += Math.cos(particle.angle) * particle.speed * intensity;
      particle.y += Math.sin(particle.angle) * particle.speed * intensity;
      particle.size *= 0.95;

      if (particle.size > 0.1) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${
          (time * 100 + particle.offset) % 360
        }, 100%, 70%, ${particle.size / 4})`;
        this.ctx.fill();
        return true;
      }
      return false;
    });

    this.ctx.restore();
  }
  drawNebulaFlow() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    // Reduced denominator by 55% to zoom in by 100% (50% more than before)
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 445;

    // Get frequency data for better audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for global effect intensity
    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    // Time-based animation
    const time = Date.now() * 0.0005; // Slower time factor for smoother animation

    // Create particle system for nebula effect
    if (!this.nebulaParticles) {
      this.nebulaParticles = Array(100)
        .fill()
        .map(() => ({
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * 0.8,
          size: Math.random() * 11.25 + 4.5, // Increased particle size by 125% (50% more than before)
          hueOffset: Math.random() * 60 - 30,
          speed: Math.random() * 0.5 + 0.5,
        }));
    }

    // Draw flowing spiral arms with gradient
    const numArms = 6; // Increased from 5 for more detail
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.8; // Increased by 125% (50% more than before)

    // Define baseHue at a higher scope so it's available for particles
    const baseHue = (time * 60) % 360;

    // Draw flowing arms with enhanced gradients
    for (let arm = 0; arm < numArms; arm++) {
      const angleOffset = (arm / numArms) * Math.PI * 2;

      // Create gradient for this arm
      const gradient = this.ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(angleOffset + time) * maxRadius,
        centerY + Math.sin(angleOffset + time) * maxRadius
      );

      // Modern gradient with multiple color stops
      const armHue = (baseHue + arm * 60) % 360;
      gradient.addColorStop(
        0,
        `hsla(${armHue}, 100%, 70%, ${0.1 + intensity * 0.2})`
      );
      gradient.addColorStop(
        0.4,
        `hsla(${(armHue + 30) % 360}, 100%, 60%, ${0.4 + intensity * 0.3})`
      );
      gradient.addColorStop(
        0.7,
        `hsla(${(armHue + 60) % 360}, 100%, 50%, ${0.6 + intensity * 0.2})`
      );
      gradient.addColorStop(1, `hsla(${(armHue + 90) % 360}, 100%, 40%, 0)`);

      this.ctx.beginPath();

      // Draw smooth curve with Bezier
      const points = [];
      const steps = 30; // Fewer points for smoother curves

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const freqIndex = Math.floor(t * bufferLength * 0.8);
        const audioValue = frequencyData[freqIndex] / 255;

        // Create spiral with audio-reactive modulation
        const spiralTightness = 5 + intensity * 3;
        const angle =
          t * Math.PI * spiralTightness + angleOffset + time * (2 + intensity);
        const radiusModulation =
          0.2 + audioValue * 0.8 + Math.sin(t * Math.PI * 4 + time * 3) * 0.1;
        const radius = t * maxRadius * radiusModulation;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        points.push({ x, y });
      }

      // Draw smooth curve through points
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      // Handle the last two points
      if (points.length > 2) {
        const last = points.length - 1;
        this.ctx.quadraticCurveTo(
          points[last - 1].x,
          points[last - 1].y,
          points[last].x,
          points[last].y
        );
      }

      // Apply the gradient
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (3 + intensity * 6) * scaleFactor;
      this.ctx.stroke();

      // Add glow effect
      this.ctx.shadowColor = `hsla(${armHue}, 100%, 70%, 0.8}`;
      this.ctx.shadowBlur = 15 * intensity;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // Reset shadow
    }

    // Draw nebula particles
    this.ctx.globalCompositeOperation = "screen";
    this.nebulaParticles.forEach((particle, i) => {
      // Update particle position
      particle.angle += (0.01 + particle.speed * 0.02) * (1 + intensity * 0.5);

      // Get frequency value for this particle
      const freqIndex = Math.floor(
        (i * bufferLength) / this.nebulaParticles.length
      );
      const freqValue = frequencyData[freqIndex] / 255;

      // Calculate position
      const radius = particle.radius * maxRadius * (0.8 + freqValue * 0.4);
      const x = centerX + Math.cos(particle.angle) * radius;
      const y = centerY + Math.sin(particle.angle) * radius;

      // Draw particle with glow
      const size = particle.size * (1 + freqValue * 1.5) * scaleFactor;
      const hue = (baseHue + particle.hueOffset + time * 30) % 360;

      const glow = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      glow.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.8 * freqValue})`);
      glow.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.4 * freqValue})`);
      glow.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawWaveTunnel() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 667; // Increased scale by 50%

    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.6; // Increased base radius by 50%
    const numRings = 8; // Reduced from 15 to create more space between rings
    const numPoints = 100;
    const time = Date.now() * 0.001;

    for (let ring = 0; ring < numRings; ring++) {
      const radius = baseRadius * (1 - ring / numRings);
      const freqIndex = Math.floor((ring / numRings) * bufferLength);
      const amplitude = (frequencyData[freqIndex] / 255) * 100 * scaleFactor; // Increased amplitude for more pronounced waves

      this.ctx.beginPath();

      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        const wave = Math.sin(angle * 6 + time * 2) * amplitude;
        const wave2 = Math.cos(angle * 8 - time * 3) * amplitude * 0.5;

        const x = centerX + (radius + wave + wave2) * Math.cos(angle);
        const y = centerY + (radius + wave + wave2) * Math.sin(angle);

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      const hue = (ring / numRings) * 360 + time * 30;
      const alpha = 1 - (ring / numRings) * 0.5;

      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
      this.ctx.lineWidth = (numRings - ring) * 1.5 * scaleFactor; // Doubled line width for more visible rings
      this.ctx.stroke();
    }
  }
  drawFreqFlower() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 533;

    // Get frequency data for better audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for dynamic effects
    const avgFrequency =
      frequencyData.reduce((sum, val) => sum + val, 0) / bufferLength;
    const intensityFactor = avgFrequency / 255;

    const time = Date.now() * 0.001;
    const numPetals = Math.floor(8 + intensityFactor * 8); // Dynamic petal count
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 1.525;

    // Clear with trail effect
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw each petal
    for (let i = 0; i < numPetals; i++) {
      const baseAngle = (i / numPetals) * Math.PI * 2;
      const freqIndex = Math.floor((i / numPetals) * (bufferLength / 2));
      const audioValue = Math.pow(frequencyData[freqIndex] / 255, 1.5);

      this.ctx.beginPath();

      // Create more complex petal shapes
      for (let t = 0; t <= 1; t += 0.01) {
        const pulseEffect = 0.2 * Math.sin(time * 3 + i);
        const waveEffect = Math.sin(t * Math.PI * 4 + time * 2) * 0.2;

        const angle = baseAngle + t * Math.PI * 0.5 + waveEffect;
        const radiusModifier = Math.sin(t * Math.PI) + pulseEffect;
        const radius = maxRadius * (0.3 + audioValue * 0.7) * radiusModifier;

        const x = centerX + Math.cos(angle + time) * radius;
        const y = centerY + Math.sin(angle + time) * radius;

        if (t === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }

      // Enhanced color gradients
      const hue = (time * 30 + (i * 360) / numPetals) % 360;
      const gradient = this.ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );

      const alpha = 0.6 + audioValue * 0.4;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha})`);
      gradient.addColorStop(
        0.5,
        `hsla(${(hue + 30) % 360}, 100%, 60%, ${alpha * 0.8})`
      );
      gradient.addColorStop(
        1,
        `hsla(${(hue + 60) % 360}, 100%, 50%, ${alpha * 0.6})`
      );

      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      // Add glow effect
      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${alpha})`;
      this.ctx.shadowBlur = 15 * audioValue;

      // Outline for definition
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${alpha * 0.8})`;
      this.ctx.lineWidth = 3 * scaleFactor;
      this.ctx.stroke();

      // Reset shadow
      this.ctx.shadowBlur = 0;
    }
  }

  drawTriangleTunnel() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 600;

    // Get frequency data for audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for intensity
    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const time = Date.now() * 0.0003; // Even slower time factor
    const numLayers = 3; // Reduced from 6
    const numTriangles = 3; // Reduced from 4

    // Create tunnel effect with fewer layers
    for (let layer = 0; layer < numLayers; layer++) {
      const depth = layer / numLayers;
      const scale = 1 - depth * 0.6;
      const zOffset = time * 1.2; // Simplified rotation
      const layerSize =
        Math.min(this.canvas.width, this.canvas.height) * 0.35 * scale;

      // Get audio data for this layer
      const freqIndex = Math.floor((layer / numLayers) * bufferLength * 0.5);
      const audioValue = frequencyData[freqIndex] / 255;

      // Draw triangles for this layer
      for (let i = 0; i < numTriangles; i++) {
        const angle = (i / numTriangles) * Math.PI * 2 + zOffset;

        // Calculate triangle vertices - simplified with no wobble
        const points = [];
        for (let j = 0; j < 3; j++) {
          const triAngle = angle + (j * Math.PI * 2) / 3;
          const radius = layerSize * (1 + audioValue * 0.2);
          points.push({
            x: centerX + Math.cos(triAngle) * radius * scaleFactor,
            y: centerY + Math.sin(triAngle) * radius * scaleFactor,
          });
        }

        // Simplified color - no gradient
        const hue = (time * 15 + layer * 40) % 360;
        const alpha = 0.7 - depth * 0.3;

        // Draw the triangle
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.lineTo(points[1].x, points[1].y);
        this.ctx.lineTo(points[2].x, points[2].y);
        this.ctx.closePath();

        // No glow effect
        this.ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
        this.ctx.fill();

        // Simple stroke
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
        this.ctx.lineWidth = 1.5 * scaleFactor;
        this.ctx.stroke();
      }
    }
  }

  drawCrystalPulse() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;

    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const time = Date.now() * 0.001;
    const numCrystals = 8;
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 1.4;

    for (let i = 0; i < numCrystals; i++) {
      const angle = (i / numCrystals) * Math.PI * 2;
      const freqIndex = Math.floor((i / numCrystals) * bufferLength);
      const audioValue = frequencyData[freqIndex] / 255;

      const radius = maxRadius * (0.3 + audioValue * 0.7);
      const points = [];

      for (let j = 0; j < 3; j++) {
        const pointAngle = angle + (j / 3) * Math.PI * 2 + time;
        points.push({
          x: centerX + Math.cos(pointAngle) * radius,
          y: centerY + Math.sin(pointAngle) * radius,
        });
      }

      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let j = 1; j < points.length; j++) {
        this.ctx.lineTo(points[j].x, points[j].y);
      }
      this.ctx.closePath();

      const hue = (time * 50 + (i * 360) / numCrystals) % 360;
      const gradient = this.ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
      );
      gradient.addColorStop(
        0,
        `hsla(${hue}, 100%, 70%, ${0.8 + intensity * 0.2})`
      );
      gradient.addColorStop(
        1,
        `hsla(${(hue + 60) % 360}, 100%, 60%, ${0.6 + intensity * 0.4})`
      );

      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }
  drawFreqWeb() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;

    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const time = Date.now() * 0.001;
    const numPoints = 8;
    const numRings = 4;
    const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 1.4;

    const points = [];
    for (let ring = 0; ring < numRings; ring++) {
      const ringPoints = [];
      const radius = (maxRadius * (ring + 1)) / numRings;

      for (let i = 0; i < numPoints; i++) {
        const angle =
          (i / numPoints) * Math.PI * 2 + time * (ring % 2 ? 1 : -1);
        const freqIndex = Math.floor((i / numPoints) * bufferLength);
        const audioValue = frequencyData[freqIndex] / 255;

        ringPoints.push({
          x: centerX + Math.cos(angle) * radius * (1 + audioValue * 0.3),
          y: centerY + Math.sin(angle) * radius * (1 + audioValue * 0.3),
        });
      }
      points.push(ringPoints);
    }

    // Draw connections between points
    for (let ring = 0; ring < points.length; ring++) {
      const currentRing = points[ring];

      for (let i = 0; i < currentRing.length; i++) {
        const point = currentRing[i];
        const nextPoint = currentRing[(i + 1) % currentRing.length];

        // Connect to next point in same ring
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineTo(nextPoint.x, nextPoint.y);

        const hue = (time * 50 + ring * 90) % 360;
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${
          0.4 + intensity * 0.6
        })`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Connect to corresponding point in next ring
        if (ring < points.length - 1) {
          const nextRingPoint = points[ring + 1][i];
          this.ctx.beginPath();
          this.ctx.moveTo(point.x, point.y);
          this.ctx.lineTo(nextRingPoint.x, nextRingPoint.y);
          this.ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 100%, 60%, ${
            0.3 + intensity * 0.7
          })`;
          this.ctx.stroke();
        }
      }
    }
  }
  drawMatrixRain() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 21 * scaleFactor; // Increased from 14 to 21 for 50% larger font
    const columns = Math.floor(width / fontSize);

    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textAlign = "center";

    // Create or update rain drops
    if (!this.rainDrops) {
      this.rainDrops = new Array(columns).fill(1);
    }

    for (let i = 0; i < columns; i++) {
      const freqIndex = Math.floor((i * bufferLength) / columns);
      const audioValue = frequencyData[freqIndex] / 255;
      const text = characters[Math.floor(Math.random() * characters.length)];
      const x = i * fontSize;
      const y = this.rainDrops[i] * fontSize;

      // Color based on audio frequency and position
      const hue = ((i / columns) * 120 + audioValue * 240) % 360;
      const brightness = 50 + audioValue * 50;
      this.ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${
        0.5 + audioValue * 0.5
      })`;
      this.ctx.fillText(text, x, y);

      if (y > height && Math.random() > 0.975 - intensity * 0.1) {
        this.rainDrops[i] = 0;
      }
      this.rainDrops[i]++;
    }
  }
  drawSmoothEqualizer() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Initialize or update bar heights with smooth transitions
    if (!this.barHeights) {
      this.barHeights = new Array(64).fill(0);
    }

    const barCount = 64;
    const barWidth = width / barCount;
    const spacing = barWidth * 0.2;

    // Update bar heights with smooth transitions and safety checks
    for (let i = 0; i < barCount; i++) {
      const startIndex = Math.floor((i * bufferLength) / barCount);
      const endIndex = Math.floor(((i + 1) * bufferLength) / barCount);
      let sum = 0;
      for (let j = startIndex; j < endIndex; j++) {
        sum += frequencyData[j];
      }
      const average = sum / (endIndex - startIndex);
      // Add safety check and limit for targetHeight
      const targetHeight = Math.min(
        average * scaleFactor * height * 0.003,
        height * 0.8 // Limit maximum height to 80% of canvas height
      );

      // Ensure smooth transition with safety check
      this.barHeights[i] = isFinite(this.barHeights[i])
        ? this.barHeights[i] + (targetHeight - this.barHeights[i]) * 0.3
        : targetHeight;

      // Add final safety check
      this.barHeights[i] = Math.min(
        Math.max(0, this.barHeights[i]),
        height * 0.8
      );
    }

    // Draw bars with enhanced gradients
    for (let i = 0; i < barCount; i++) {
      const barHeight = this.barHeights[i];
      const x = i * barWidth;

      // Create gradient
      const gradient = this.ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeight
      );
      const hue = (i / barCount) * 180 + Date.now() * 0.05;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.9)`);
      gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 70%, 1.0)`);

      // Draw main bar
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        x + spacing / 2,
        height - barHeight,
        barWidth - spacing,
        barHeight
      );

      // Draw reflection
      const reflectionGradient = this.ctx.createLinearGradient(
        0,
        height,
        0,
        height + barHeight * 0.4
      );
      reflectionGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.4)`);
      reflectionGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      this.ctx.fillStyle = reflectionGradient;
      this.ctx.fillRect(
        x + spacing / 2,
        height,
        barWidth - spacing,
        barHeight * 0.4
      );

      // Add glow effect
      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
      this.ctx.shadowBlur = 15;
      this.ctx.fillRect(
        x + spacing / 2,
        height - barHeight,
        barWidth - spacing,
        barHeight
      );
      this.ctx.shadowBlur = 0;
    }
  }
  drawRibbons() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 1000;

    // Initialize ribbons if not exists
    if (!this.ribbons) {
      this.ribbons = Array.from({ length: 5 }, (_, i) => ({
        points: Array.from({ length: 50 }, () => ({
          x: centerX,
          y: centerY,
          angle: Math.random() * Math.PI * 2,
        })),
        hue: (i * 360) / 5,
      }));
    }

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;

    // Update and draw ribbons
    this.ribbons.forEach((ribbon, ribbonIndex) => {
      const freqIndex = Math.floor(
        (ribbonIndex * bufferLength) / this.ribbons.length
      );
      const freqValue = frequencyData[freqIndex] / 255;

      // Update points
      ribbon.points.forEach((point, i) => {
        if (i === 0) {
          // Lead point follows a complex pattern
          const angle = time + ribbonIndex * Math.PI * 0.4;
          const radius = 100 * (1 + intensity) * Math.sin(time * 0.5);
          point.x = centerX + Math.cos(angle) * radius;
          point.y = centerY + Math.sin(angle) * radius;
        } else {
          // Other points follow the previous point
          const prev = ribbon.points[i - 1];
          const dx = prev.x - point.x;
          const dy = prev.y - point.y;
          point.x += dx * (0.15 + freqValue * 0.1);
          point.y += dy * (0.15 + freqValue * 0.1);
        }
      });

      // Draw ribbon
      this.ctx.beginPath();
      this.ctx.moveTo(ribbon.points[0].x, ribbon.points[0].y);

      // Create smooth curve through points
      for (let i = 1; i < ribbon.points.length - 2; i++) {
        const xc = (ribbon.points[i].x + ribbon.points[i + 1].x) / 2;
        const yc = (ribbon.points[i].y + ribbon.points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(
          ribbon.points[i].x,
          ribbon.points[i].y,
          xc,
          yc
        );
      }

      // Connect the last two points
      const last = ribbon.points[ribbon.points.length - 1];
      const secondLast = ribbon.points[ribbon.points.length - 2];
      this.ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);

      // Style and stroke the ribbon
      const hue = (ribbon.hue + time * 50) % 360;
      const gradient = this.ctx.createLinearGradient(
        centerX - 200,
        centerY - 200,
        centerX + 200,
        centerY + 200
      );
      gradient.addColorStop(
        0,
        `hsla(${hue}, 100%, 50%, ${0.1 + freqValue * 0.4})`
      );
      gradient.addColorStop(
        1,
        `hsla(${(hue + 60) % 360}, 100%, 50%, ${0.1 + freqValue * 0.4})`
      );

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (4 + freqValue * 8) * scaleFactor;
      this.ctx.stroke();
    });
  }

  drawGeometricWeb() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for intensity
    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const time = Date.now() * 0.001;
    const lineCount = 16; // Reduced from 36+

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(0, 0, width, height);

    // Create simplified base geometry
    for (let i = 0; i < lineCount; i++) {
      const angle = (i * Math.PI * 2) / lineCount + time * 0.5;
      const freqIndex = Math.floor((i / lineCount) * bufferLength);
      const freqValue = frequencyData[freqIndex] / 255;
      // Increased base radius by 100% (150 -> 300) and frequency amplitude (100 -> 200)
      const radius = 300 + freqValue * 200;

      // Simplified color - no gradient
      const hue = (time * 20 + i * 20) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.7)`;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      // Increased line width proportionally
      this.ctx.lineWidth = 4 + freqValue * 6;
      this.ctx.stroke();
    }

    // Add simplified rings
    for (let i = 0; i < 2; i++) {
      // Reduced from 3
      // Increased ring sizes by 100%
      const ringSize = 160 + i * 120 + intensity * 40;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${
        (time * 30 + i * 120) % 360
      }, 80%, 50%, 0.5)`;
      // Increased line width proportionally
      this.ctx.lineWidth = 4 + intensity * 4;
      this.ctx.setLineDash([10, 16]); // Increased dash pattern proportionally
      this.ctx.stroke();
    }
  }

  drawKaleidoscope() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;
    const segments = 15; // Increased number of segments for more detail
    const radius = Math.min(width, height) * 0.85; // Increased radius multiplier for larger effect

    // Create a temporary canvas for the segment
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement("canvas");
      this.tempCtx = this.tempCanvas.getContext("2d");
    }
    this.tempCanvas.width = radius;
    this.tempCanvas.height = radius;

    // Draw the base segment
    this.tempCtx.clearRect(0, 0, radius, radius);
    for (let i = 0; i < 50; i++) {
      const freqIndex = Math.floor((i * bufferLength) / 50);
      const freqValue = frequencyData[freqIndex] / 255;

      const x = Math.random() * radius;
      const y = Math.random() * radius;
      const size = (8 + freqValue * 20) * scaleFactor; // Increased base size and frequency influence

      const hue = (time * 50 + (i * 360) / 50) % 360;
      this.tempCtx.fillStyle = `hsla(${hue}, 100%, 50%, ${
        0.5 + freqValue * 0.5
      })`;

      this.tempCtx.beginPath();
      this.tempCtx.arc(x, y, size, 0, Math.PI * 2);
      this.tempCtx.fill();
    }

    // Draw the kaleidoscope
    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments + time * (1 + intensity);

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(angle);

      // Draw normal segment
      this.ctx.drawImage(this.tempCanvas, 0, -radius / 2, radius, radius);

      // Draw mirrored segment
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.tempCanvas, 0, -radius / 2, radius, radius);

      this.ctx.restore();
    }
  }
  drawStarfield() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 1000;

    // Initialize stars if not exists
    if (!this.stars) {
      this.stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * 1000,
        size: Math.random() * 2 + 1,
      }));
    }

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    // Update and draw stars
    this.stars.forEach((star, i) => {
      // Update z position (moving towards viewer)
      star.z -= 5 + intensity * 15;

      // Reset star if it's too close
      if (star.z <= 0) {
        star.z = 1000;
        star.x = Math.random() * width - width / 2;
        star.y = Math.random() * height - height / 2;
      }

      // Project 3D position to 2D screen
      const scale = 400 / star.z;
      const x = width / 2 + star.x * scale;
      const y = height / 2 + star.y * scale;

      // Get frequency value for this star
      const freqIndex = Math.floor((i * bufferLength) / this.stars.length);
      const freqValue = frequencyData[freqIndex] / 255;

      // Draw star
      const size = (star.size + freqValue * 2) * scale * scaleFactor;
      const alpha = Math.min(1, (1000 - star.z) / 1000 + freqValue * 0.5);
      const hue = (star.z + Date.now() * 0.05) % 360;

      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
      this.ctx.fill();
    });
  }

  drawFloatingShapes() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;

    // Initialize particles if not exists
    if (!this.particles) {
      this.particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 30 + 10,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        type: Math.random() > 0.5 ? "circle" : "triangle",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      }));
    }

    // Get frequency data for audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    // Update and draw particles
    this.particles.forEach((particle, i) => {
      // Update position
      particle.x += particle.speedX * (1 + intensity);
      particle.y += particle.speedY * (1 + intensity);
      particle.rotation += particle.rotationSpeed * (1 + intensity);

      // Wrap around screen
      if (particle.x < -particle.size) particle.x = width + particle.size;
      if (particle.x > width + particle.size) particle.x = -particle.size;
      if (particle.y < -particle.size) particle.y = height + particle.size;
      if (particle.y > height + particle.size) particle.y = -particle.size;

      // Get frequency value for this particle
      const freqIndex = Math.floor((i * bufferLength) / this.particles.length);
      const freqValue = frequencyData[freqIndex] / 255;

      // Draw shape
      const size = particle.size * (1 + freqValue * 0.5);
      const hue = (Date.now() * 0.05 + (i * 360) / this.particles.length) % 360;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + freqValue * 0.4})`;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${
        0.5 + freqValue * 0.5
      })`;
      this.ctx.lineWidth = 2;

      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);

      if (particle.type === "circle") {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(
          size * Math.cos(Math.PI / 6),
          size * Math.sin(Math.PI / 6)
        );
        this.ctx.lineTo(
          -size * Math.cos(Math.PI / 6),
          size * Math.sin(Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  drawCubeArray() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800;

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for global intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;

    // Calculate grid size based on viewport dimensions
    const minDimension = Math.min(width, height);
    const targetSpacing = minDimension / 10; // Aim for roughly 10 cubes across the shortest dimension
    const spacing = targetSpacing * (0.8 + intensity * 0.4); // Allow spacing to react to audio

    // Calculate grid boundaries to fill viewport
    const gridSizeX = Math.ceil(width / spacing);
    const gridSizeY = Math.ceil(height / spacing);

    // Adjust base size to be proportional to spacing
    const baseSize = spacing * 0.8;

    for (
      let x = -Math.ceil(gridSizeX / 2);
      x <= Math.ceil(gridSizeX / 2);
      x++
    ) {
      for (
        let y = -Math.ceil(gridSizeY / 2);
        y <= Math.ceil(gridSizeY / 2);
        y++
      ) {
        const distance = Math.sqrt(x * x + y * y);
        const freqIndex = Math.floor(
          (distance / (Math.max(gridSizeX, gridSizeY) * Math.sqrt(2))) *
            bufferLength
        );
        const audioValue = frequencyData[freqIndex] / 255;

        const posX = centerX + x * spacing;
        const posY = centerY + y * spacing;
        const size = baseSize * (0.6 + audioValue * 0.4) * scaleFactor;
        const rotation = time + distance * 0.5;

        this.ctx.save();
        this.ctx.translate(posX, posY);
        this.ctx.rotate(rotation);

        const hue = (time * 50 + distance * 30) % 360;
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${
          0.6 + audioValue * 0.4
        })`;
        this.ctx.lineWidth = (2 + audioValue * 3) * scaleFactor;

        // Draw cube
        this.ctx.beginPath();
        this.ctx.rect(-size / 2, -size / 2, size, size);
        this.ctx.stroke();

        // Draw diagonal lines
        this.ctx.beginPath();
        this.ctx.moveTo(-size / 2, -size / 2);
        this.ctx.lineTo(size / 2, size / 2);
        this.ctx.moveTo(size / 2, -size / 2);
        this.ctx.lineTo(-size / 2, size / 2);
        this.ctx.stroke();

        this.ctx.restore();
      }
    }
  }
  drawWaveGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const time = Date.now() * 0.001;
    const gridSize = 20;
    const cellSize = Math.min(width, height) / gridSize;

    for (let x = 0; x <= gridSize; x++) {
      for (let y = 0; y <= gridSize; y++) {
        const posX = (x / gridSize) * width;
        const posY = (y / gridSize) * height;

        const distanceToCenter = Math.sqrt(
          Math.pow(x / gridSize - 0.5, 2) + Math.pow(y / gridSize - 0.5, 2)
        );

        const freqIndex = Math.floor(distanceToCenter * bufferLength);
        const audioValue =
          frequencyData[Math.min(freqIndex, bufferLength - 1)] / 255;

        const waveOffset =
          Math.sin(time * 2 + distanceToCenter * 5) * 20 * scaleFactor;
        const displacement = waveOffset * (1 + audioValue);

        const hue = (time * 30 + distanceToCenter * 180) % 360;
        const alpha = 0.5 + audioValue * 0.5;

        if (x < gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(posX + displacement, posY);
          this.ctx.lineTo(posX + cellSize + displacement, posY);
          this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
          this.ctx.lineWidth = (1 + audioValue * 3) * scaleFactor;
          this.ctx.stroke();
        }

        if (y < gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(posX, posY + displacement);
          this.ctx.lineTo(posX, posY + cellSize + displacement);
          this.ctx.strokeStyle = `hsla(${hue + 30}, 100%, 50%, ${alpha})`;
          this.ctx.lineWidth = (1 + audioValue * 3) * scaleFactor;
          this.ctx.stroke();
        }
      }
    }
  }
  drawConstellation() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 500; // Increased scale factor by reducing divisor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const time = Date.now() * 0.001;
    const numPoints = 30;
    const points = [];

    // Generate points
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + time * 0.5;
      const freqIndex = Math.floor((i / numPoints) * bufferLength);
      const audioValue = frequencyData[freqIndex] / 255;
      const radius = (200 + audioValue * 150) * scaleFactor; // Increased base radius and audio reactivity

      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        audioValue: audioValue,
      });
    }

    // Draw connections
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const distance = Math.sqrt(
          Math.pow(points[i].x - points[j].x, 2) +
            Math.pow(points[i].y - points[j].y, 2)
        );

        if (distance < 200 * scaleFactor) {
          // Increased connection distance threshold
          const alpha =
            ((1 - distance / (200 * scaleFactor)) * // Updated alpha calculation
              (points[i].audioValue + points[j].audioValue)) /
            2;

          this.ctx.beginPath();
          this.ctx.moveTo(points[i].x, points[i].y);
          this.ctx.lineTo(points[j].x, points[j].y);

          const hue = (time * 50 + distance) % 360;
          this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
          this.ctx.lineWidth =
            (1.5 + (points[i].audioValue + points[j].audioValue) * 3) *
            scaleFactor; // Increased line width
          this.ctx.stroke();
        }
      }
    }

    // Draw points
    points.forEach((point, i) => {
      const hue = (time * 50 + (i * 360) / points.length) % 360;
      this.ctx.beginPath();
      this.ctx.arc(
        point.x,
        point.y,
        (4 + point.audioValue * 7) * scaleFactor,
        0,
        Math.PI * 2
      ); // Increased point size
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.8})`;
      this.ctx.fill();
    });
  }

  drawPolyhedron() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 235; // Increased scale factor by 70%

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate audio intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;

    // Define vertices for an octahedron
    const baseSize = 100 * scaleFactor * (1 + intensity * 0.5);
    const vertices = [
      [0, baseSize, 0],
      [0, -baseSize, 0],
      [baseSize, 0, 0],
      [-baseSize, 0, 0],
      [0, 0, baseSize],
      [0, 0, -baseSize],
    ];

    // Define edges
    const edges = [
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 4],
      [2, 5],
      [3, 4],
      [3, 5],
    ];

    // Rotate vertices
    const rotatedVertices = vertices.map((v) => {
      let [x, y, z] = v;

      // Rotate around Y
      const rotY = time * 0.8; // Increased rotation speed
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      [x, z] = [x * cosY - z * sinY, x * sinY + z * cosY];

      // Rotate around X
      const rotX = time * 0.5; // Increased rotation speed
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];

      // Project to 2D
      const scale = 1000 / (1000 + z);
      return [centerX + x * scale, centerY + y * scale];
    });

    // Draw edges
    edges.forEach((edge, i) => {
      const freqIndex = Math.floor((i * bufferLength) / edges.length);
      const audioValue = frequencyData[freqIndex] / 255;

      this.ctx.beginPath();
      this.ctx.moveTo(rotatedVertices[edge[0]][0], rotatedVertices[edge[0]][1]);
      this.ctx.lineTo(rotatedVertices[edge[1]][0], rotatedVertices[edge[1]][1]);

      const hue = (time * 50 + (i * 360) / edges.length) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${
        0.6 + audioValue * 0.4
      })`;
      this.ctx.lineWidth = (2 + audioValue * 4) * scaleFactor;
      this.ctx.stroke();
    });

    // Draw vertices
    rotatedVertices.forEach((vertex, i) => {
      const freqIndex = Math.floor((i * bufferLength) / vertices.length);
      const audioValue = frequencyData[freqIndex] / 255;

      this.ctx.beginPath();
      this.ctx.arc(
        vertex[0],
        vertex[1],
        (4 + audioValue * 4) * scaleFactor,
        0,
        Math.PI * 2
      );
      const hue = (time * 50 + i * 60) % 360;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
      this.ctx.fill();
    });
  }

  drawFractalTree() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 500; // Increased scale factor by 60%

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate audio intensity with enhanced sensitivity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = Math.pow(averageFrequency / 255, 1.3); // Enhanced intensity scaling

    const time = Date.now() * 0.001;

    const drawBranch = (x, y, length, angle, depth, branchIndex) => {
      if (depth === 0) return;

      const freqIndex = Math.floor((branchIndex * bufferLength) / 32);
      const audioValue = Math.pow(frequencyData[freqIndex] / 255, 1.2); // Enhanced audio response

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      const hue = (time * 50 + depth * 60) % 360;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${
        0.7 + audioValue * 0.3
      })`;
      this.ctx.lineWidth = (depth + audioValue * 4) * scaleFactor; // Increased line width
      this.ctx.stroke();

      const branchAngle =
        Math.PI / 4 + Math.sin(time * 2 + audioValue * 3) * 0.3; // Enhanced branch angle variation
      const newLength = length * (0.7 + audioValue * 0.15); // Enhanced length variation

      drawBranch(
        endX,
        endY,
        newLength,
        angle - branchAngle,
        depth - 1,
        branchIndex * 2
      );
      drawBranch(
        endX,
        endY,
        newLength,
        angle + branchAngle,
        depth - 1,
        branchIndex * 2 + 1
      );
    };

    const startLength = 160 * scaleFactor * (1 + intensity * 0.4); // Increased base length
    const startAngle = -Math.PI / 2;
    drawBranch(width / 2, height, startLength, startAngle, 7, 0); // Increased depth
  }

  drawHypercube() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 400;

    // Get frequency data for audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate audio intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;

    // 4D hypercube vertices (16 points in 4D space)
    const vertices4D = [
      [-1, -1, -1, -1],
      [1, -1, -1, -1],
      [-1, 1, -1, -1],
      [1, 1, -1, -1],
      [-1, -1, 1, -1],
      [1, -1, 1, -1],
      [-1, 1, 1, -1],
      [1, 1, 1, -1],
      [-1, -1, -1, 1],
      [1, -1, -1, 1],
      [-1, 1, -1, 1],
      [1, 1, -1, 1],
      [-1, -1, 1, 1],
      [1, -1, 1, 1],
      [-1, 1, 1, 1],
      [1, 1, 1, 1],
    ];

    // Rotation angles
    const rotationXY = time * 0.5;
    const rotationYZ = time * 0.3;
    const rotationZW = time * 0.7;
    const rotationXW = time * 0.4;

    // Project 4D points to 3D
    const vertices3D = vertices4D.map((v) => {
      let [x, y, z, w] = v;

      // Apply 4D rotations
      // XY rotation
      [x, y] = [
        x * Math.cos(rotationXY) - y * Math.sin(rotationXY),
        x * Math.sin(rotationXY) + y * Math.cos(rotationXY),
      ];

      // YZ rotation
      [y, z] = [
        y * Math.cos(rotationYZ) - z * Math.sin(rotationYZ),
        y * Math.sin(rotationYZ) + z * Math.cos(rotationYZ),
      ];

      // ZW rotation
      [z, w] = [
        z * Math.cos(rotationZW) - w * Math.sin(rotationZW),
        z * Math.sin(rotationZW) + w * Math.cos(rotationZW),
      ];

      // XW rotation
      [x, w] = [
        x * Math.cos(rotationXW) - w * Math.sin(rotationXW),
        x * Math.sin(rotationXW) + w * Math.cos(rotationXW),
      ];

      // 4D to 3D projection
      const scale = 2 / (2 + w);
      return [x * scale, y * scale, z * scale];
    });

    // Project 3D points to 2D
    const vertices2D = vertices3D.map((v) => {
      const scale = 200 * scaleFactor * (1 + intensity * 0.5);
      return [centerX + v[0] * scale, centerY + v[1] * scale];
    });

    // Draw edges
    const edges = [
      [0, 1],
      [0, 2],
      [0, 4],
      [0, 8],
      [1, 3],
      [1, 5],
      [1, 9],
      [2, 3],
      [2, 6],
      [2, 10],
      [3, 7],
      [3, 11],
      [4, 5],
      [4, 6],
      [4, 12],
      [5, 7],
      [5, 13],
      [6, 7],
      [6, 14],
      [7, 15],
      [8, 9],
      [8, 10],
      [8, 12],
      [9, 11],
      [9, 13],
      [10, 11],
      [10, 14],
      [11, 15],
      [12, 13],
      [12, 14],
      [13, 15],
      [14, 15],
    ];

    edges.forEach((edge, i) => {
      const [a, b] = edge;
      const freqIndex = Math.floor((i * bufferLength) / edges.length);
      const audioValue = frequencyData[freqIndex] / 255;

      this.ctx.beginPath();
      this.ctx.moveTo(vertices2D[a][0], vertices2D[a][1]);
      this.ctx.lineTo(vertices2D[b][0], vertices2D[b][1]);

      const hue = (time * 50 + (i * 360) / edges.length) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${
        0.6 + audioValue * 0.4
      })`;
      this.ctx.lineWidth = (3 + audioValue * 4) * scaleFactor;
      this.ctx.stroke();
    });

    // Draw vertices
    vertices2D.forEach((vertex, i) => {
      const freqIndex = Math.floor((i * bufferLength) / vertices2D.length);
      const audioValue = frequencyData[freqIndex] / 255;

      this.ctx.beginPath();
      this.ctx.arc(
        vertex[0],
        vertex[1],
        (4 + audioValue * 4) * scaleFactor,
        0,
        Math.PI * 2
      );
      const hue = (time * 50 + (i * 360) / vertices2D.length) % 360;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.7 + audioValue * 0.3})`;
      this.ctx.fill();
    });
  }

  drawGeometric() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 600; // Increased scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;
    const sides = 6; // Hexagonal base
    const layers = 6; // Increased layers

    for (let layer = 1; layer <= layers; layer++) {
      const radius = layer * 80 * scaleFactor * (1 + intensity * 0.5); // Increased base radius and intensity influence
      const angleOffset = (time * (layer % 2 ? 1 : -1)) % (Math.PI * 2);

      this.ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + angleOffset;
        const freqIndex = Math.floor((i / sides) * bufferLength);
        const audioValue = frequencyData[freqIndex] / 255;
        const radiusOffset = radius * (1 + audioValue * 0.2);

        const x = centerX + Math.cos(angle) * radiusOffset;
        const y = centerY + Math.sin(angle) * radiusOffset;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      const hue = (time * 50 + layer * 60) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${
        0.6 + intensity * 0.4
      })`;
      this.ctx.lineWidth = (4 + intensity * 4) * scaleFactor; // Increased line width
      this.ctx.stroke();

      // Draw connecting lines between layers
      if (layer > 1) {
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 + angleOffset;
          const freqIndex = Math.floor((i / sides) * bufferLength);
          const audioValue = frequencyData[freqIndex] / 255;

          const innerRadius =
            (layer - 1) * 50 * scaleFactor * (1 + intensity * 0.3);
          const outerRadius = radius;

          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * outerRadius;
          const y2 = centerY + Math.sin(angle) * outerRadius;

          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          this.ctx.lineTo(x2, y2);
          this.ctx.strokeStyle = `hsla(${
            ((angle * 180) / Math.PI + time * 50) % 360
          }, 100%, 50%, ${0.4 + audioValue * 0.4})`;
          this.ctx.lineWidth = (2 + audioValue * 4) * scaleFactor; // Increased line width
          this.ctx.stroke();
        }
      }
    }
  }

  drawPonds() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(this.canvas.width, this.canvas.height) / 1000;

    // Get frequency data for better audio reactivity
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for global effect intensity
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += frequencyData[i];
    }
    const averageFrequency = sum / bufferLength;
    const globalIntensity = averageFrequency / 255; // Normalized 0-1

    // Draw multiple concentric circles
    for (let ring = 0; ring < 8; ring++) {
      const baseRadius = (ring + 1) * 50 * scaleFactor;

      this.ctx.beginPath();
      for (let i = 0; i < bufferLength; i += 4) {
        // Use frequency data for more dynamic response
        const value = frequencyData[i];
        const normalizedValue = value / 255;
        const angle = (i * 2 * Math.PI) / bufferLength;

        // Enhanced radius variation with frequency response
        const radiusVariation =
          normalizedValue * 40 * scaleFactor * (1 + globalIntensity);
        const radius = baseRadius + radiusVariation;

        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();

      // Enhanced rainbow gradient effect with audio reactivity
      const hue = (Date.now() * 0.05 + ring * 45) % 360;
      const saturation = 100;
      const lightness = 50 + globalIntensity * 20; // Make brightness reactive
      const alpha = 0.5 + globalIntensity * 0.3; // Make opacity reactive

      this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      this.ctx.lineWidth = (2 + globalIntensity * 3) * scaleFactor; // Make line width reactive
      this.ctx.stroke();
    }
  }

  drawFloatingShapes() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;

    // Define and update shapes
    if (!this.shapes) {
      this.shapes = Array.from({ length: 20 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 30 + 20,
        rotation: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3), // 0: circle, 1: square, 2: triangle
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      }));
    }

    this.shapes.forEach((shape, i) => {
      const freqIndex = Math.floor((i * bufferLength) / this.shapes.length);
      const audioValue = frequencyData[freqIndex] / 255;

      // Update position
      shape.x += shape.speedX * (1 + intensity * 2);
      shape.y += shape.speedY * (1 + intensity * 2);
      shape.rotation += shape.rotationSpeed * (1 + intensity);

      // Wrap around screen
      if (shape.x < -shape.size) shape.x = width + shape.size;
      if (shape.x > width + shape.size) shape.x = -shape.size;
      if (shape.y < -shape.size) shape.y = height + shape.size;
      if (shape.y > height + shape.size) shape.y = -shape.size;

      // Draw shape
      const hue = (time * 50 + (i * 360) / this.shapes.length) % 360;
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.6 + audioValue * 0.4})`;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${
        0.8 + audioValue * 0.2
      })`;
      this.ctx.lineWidth = (2 + audioValue * 3) * scaleFactor;

      this.ctx.save();
      this.ctx.translate(shape.x, shape.y);
      this.ctx.rotate(shape.rotation);

      const size = shape.size * (1 + audioValue * 0.5) * scaleFactor;

      switch (shape.type) {
        case 0: // Circle
          this.ctx.beginPath();
          this.ctx.arc(0, 0, size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          break;
        case 1: // Square
          this.ctx.fillRect(-size, -size, size * 2, size * 2);
          this.ctx.strokeRect(-size, -size, size * 2, size * 2);
          break;
        case 2: // Triangle
          this.ctx.beginPath();
          this.ctx.moveTo(0, -size);
          this.ctx.lineTo(size, size);
          this.ctx.lineTo(-size, size);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          break;
      }

      this.ctx.restore();
    });
  }

  drawStarfield() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate audio intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    // Initialize stars if not exists
    if (!this.stars) {
      this.stars = Array.from({ length: 200 }, () => ({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * 2000,
      }));
    }

    // Update and draw stars
    this.stars.forEach((star, i) => {
      const freqIndex = Math.floor((i * bufferLength) / this.stars.length);
      const audioValue = frequencyData[freqIndex] / 255;

      // Move stars closer (z decreases)
      star.z -= 10 + intensity * 20;

      // Reset star if it's too close
      if (star.z <= 0) {
        star.x = (Math.random() - 0.5) * width * 2;
        star.y = (Math.random() - 0.5) * height * 2;
        star.z = 2000;
      }

      // Project 3D position to 2D screen
      const k = 128.0 / star.z;
      const px = star.x * k + centerX;
      const py = star.y * k + centerY;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const size = (1 - star.z / 2000) * 3 * (1 + audioValue) * scaleFactor;
        const brightness = 1 - star.z / 2000;

        this.ctx.beginPath();
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(i * 2) % 360}, 80%, 80%, ${brightness})`;
        this.ctx.fill();

        // Optional: Add glow effect
        const glow = this.ctx.createRadialGradient(px, py, 0, px, py, size * 2);
        glow.addColorStop(
          0,
          `hsla(${(i * 2) % 360}, 80%, 80%, ${brightness * 0.5})`
        );
        glow.addColorStop(1, "transparent");
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawGeometricWeb() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for intensity
    const avgFrequency =
      frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength;
    const intensity = avgFrequency / 255;

    const time = Date.now() * 0.001;
    const lineCount = 16; // Reduced from 36+

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(0, 0, width, height);

    // Create simplified base geometry
    for (let i = 0; i < lineCount; i++) {
      const angle = (i * Math.PI * 2) / lineCount + time * 0.5;
      const freqIndex = Math.floor((i / lineCount) * bufferLength);
      const freqValue = frequencyData[freqIndex] / 255;
      // Increased base radius by 100% (150 -> 300) and frequency amplitude (100 -> 200)
      const radius = 300 + freqValue * 200;

      // Simplified color - no gradient
      const hue = (time * 20 + i * 20) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.7)`;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      // Increased line width proportionally
      this.ctx.lineWidth = 4 + freqValue * 6;
      this.ctx.stroke();
    }

    // Add simplified rings
    for (let i = 0; i < 2; i++) {
      // Reduced from 3
      // Increased ring sizes by 100%
      const ringSize = 160 + i * 120 + intensity * 40;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${
        (time * 30 + i * 120) % 360
      }, 80%, 50%, 0.5)`;
      // Increased line width proportionally
      this.ctx.lineWidth = 4 + intensity * 4;
      this.ctx.setLineDash([10, 16]); // Increased dash pattern proportionally
      this.ctx.stroke();
    }
  }

  drawKaleidoscope() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 533; // Reduced denominator by ~33% for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency for effect intensity
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    const averageFrequency = sum / bufferLength;
    const intensity = averageFrequency / 255;

    const time = Date.now() * 0.001;
    const segments = 12; // Increased number of segments for more detail
    const radius = Math.min(width, height) * 0.95; // Increased radius multiplier for larger effect

    // Create a temporary canvas for the segment
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement("canvas");
      this.tempCtx = this.tempCanvas.getContext("2d");
    }
    this.tempCanvas.width = radius;
    this.tempCanvas.height = radius;

    // Draw the base segment
    this.tempCtx.clearRect(0, 0, radius, radius);
    for (let i = 0; i < 60; i++) {
      // Increased number of elements
      const freqIndex = Math.floor((i * bufferLength) / 60);
      const freqValue = frequencyData[freqIndex] / 255;

      const x = Math.random() * radius;
      const y = Math.random() * radius;
      const size = (12 + freqValue * 30) * scaleFactor; // Increased base size and frequency influence

      const hue = (time * 50 + (i * 360) / 60) % 360;
      this.tempCtx.fillStyle = `hsla(${hue}, 100%, 50%, ${
        0.5 + freqValue * 0.5
      })`;

      this.tempCtx.beginPath();
      this.tempCtx.arc(x, y, size, 0, Math.PI * 2);
      this.tempCtx.fill();
    }

    // Draw the kaleidoscope
    for (let i = 0; i < segments; i++) {
      const angle =
        (i * Math.PI * 2) / segments + time * (0.3 + intensity * 0.2);

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(angle);

      // Draw normal segment
      this.ctx.drawImage(this.tempCanvas, 0, -radius / 2, radius, radius);

      // Draw mirrored segment
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.tempCanvas, 0, -radius / 2, radius, radius);

      this.ctx.restore();
    }
  }

  drawRibbons() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bufferLength = this.analyser.frequencyBinCount;
    const scaleFactor = Math.min(width, height) / 800; // Reduced denominator for larger scale factor

    // Get frequency data
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const time = Date.now() * 0.001;
    const ribbonCount = 3;

    for (let r = 0; r < ribbonCount; r++) {
      const points = [];
      const ribbonOffset = (r * 2 * Math.PI) / ribbonCount;

      // Generate points for the ribbon
      for (let i = 0; i < width; i += 5) {
        const freqIndex = Math.floor((i / width) * bufferLength);
        const audioValue = frequencyData[freqIndex] / 255;

        const x = i;
        const baseY = height / 2;
        const wave1 = Math.sin(i * 0.02 + time + ribbonOffset) * 50;
        const wave2 = Math.cos(i * 0.01 - time * 2) * 30;
        const audioDisplacement = audioValue * 100;
        const y = baseY + wave1 + wave2 + audioDisplacement;

        points.push({ x, y, audioValue });
      }

      // Draw ribbon
      this.ctx.beginPath();
      points.forEach((point, i) => {
        if (i === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          // Use bezier curves for smoother lines
          const prevPoint = points[i - 1];
          const cpx = (point.x + prevPoint.x) / 2;
          this.ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, point.y);
        }
      });

      // Create gradient for the ribbon
      const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
      const baseHue = (time * 50 + r * 120) % 360;
      gradient.addColorStop(0, `hsla(${baseHue}, 100%, 50%, 0.5)`);
      gradient.addColorStop(
        0.5,
        `hsla(${(baseHue + 60) % 360}, 100%, 50%, 0.5)`
      );
      gradient.addColorStop(
        1,
        `hsla(${(baseHue + 120) % 360}, 100%, 50%, 0.5)`
      );

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (10 + r * 5) * scaleFactor;
      this.ctx.stroke();
    }
  }

  setupFullscreenControl() {
    // Create fullscreen button with better styling
    const fullscreenBtn = document.createElement("button");
    fullscreenBtn.textContent = "Fullscreen";
    fullscreenBtn.style.position = "fixed";
    fullscreenBtn.style.bottom = "20px";
    fullscreenBtn.style.right = "20px";
    fullscreenBtn.style.zIndex = "10000"; // Increased z-index
    fullscreenBtn.style.padding = "10px 20px";
    fullscreenBtn.style.cursor = "pointer";
    fullscreenBtn.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    fullscreenBtn.style.color = "white";
    fullscreenBtn.style.border = "1px solid white";
    fullscreenBtn.style.borderRadius = "5px";
    fullscreenBtn.style.fontSize = "16px";
    fullscreenBtn.style.fontFamily = "Arial, sans-serif";
    document.body.appendChild(fullscreenBtn);

    // Handle fullscreen button click with try-catch
    fullscreenBtn.onclick = async () => {
      try {
        if (!document.fullscreenElement) {
          await this.canvas.requestFullscreen({
            navigationUI: "hide",
          });
        } else {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error(`Fullscreen error: ${err.message}`);
      }
    };

    // Handle keyboard shortcut (keep existing code)
    document.addEventListener("keydown", (event) => {
      if (event.key === "f" || event.key === "F") {
        if (!document.fullscreenElement) {
          this.canvas.requestFullscreen().catch((err) => {
            console.log(
              `Error attempting to enable fullscreen: ${err.message}`
            );
          });
        } else {
          document.exitFullscreen();
        }
      }
    });

    // Handle fullscreen change (keep existing code)
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        this.canvas.width = window.screen.width;
        this.canvas.height = window.screen.height;
      } else {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.analyser.getByteTimeDomainData(this.dataArray);

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const now = Date.now();
    if (now - this.lastEffectChange > this.changeInterval) {
      // Create an array of available effects excluding the current one
      const availableEffects = this.effects.filter(
        (_, index) => index !== this.currentEffect
      );
      // Randomly select from available effects
      const randomIndex = Math.floor(Math.random() * availableEffects.length);
      // Find the actual index in the original effects array
      this.currentEffect = this.effects.indexOf(availableEffects[randomIndex]);

      this.lastEffectChange = now;
      this.changeInterval = this.getRandomInterval();
    }

    switch (this.effects[this.currentEffect]) {
      case "waveform":
        this.drawWaveform();
        break;
      case "equalizer":
        this.drawEqualizer();
        break;
      case "spiral":
        this.drawSpiral();
        break;
      case "circular":
        this.drawCircular();
        break;
      case "ponds":
        this.drawPonds();
        break;
      case "lightspeed":
        this.drawLightspeed();
        break;
      case "dnahelix":
        this.drawDNAHelix();
        break;
      case "matrixrain":
        this.drawMatrixRain();
        break;
      case "geometric":
        this.drawGeometric();
        break;
      case "hypercube":
        this.drawHypercube();
        break;
      case "cubearray":
        this.drawCubeArray();
        break;
      case "wavegrid":
        this.drawWaveGrid();
        break;
      case "constellation":
        this.drawConstellation();
        break;
      case "polyhedron":
        this.drawPolyhedron();
        break;
      case "fractaltree":
        this.drawFractalTree();
        break;
      case "floatingShapes":
        this.drawFloatingShapes();
        break;
      case "starfield":
        this.drawStarfield();
        break;
      case "geometricWeb":
        this.drawGeometricWeb();
        break;

      case "ribbons":
        this.drawRibbons();
        break;
      case "smoothEqualizer":
        this.drawSmoothEqualizer();
        break;
      case "nebulaFlow":
        this.drawNebulaFlow();
        break;
      case "waveTunnel":
        this.drawWaveTunnel();
        break;
      case "freqFlower":
        this.drawFreqFlower();
        break;
      case "freqWeb":
        this.drawFreqWeb();
        break;
      case "crystalPulse":
        this.drawCrystalPulse();
        break;
      case "triangleTunnel":
        this.drawTriangleTunnel();
        break;
    }

    // Draw the bouncing text on top of the visualization if enabled
    if (this.showText) {
      this.drawBouncingText();
    }
  }
} // Add closing brace for AudioVisualizer class here

// Change from 'var' to 'let' and remove duplicate declarations
let startButton = document.getElementById("startButton");
// Remove the global visualizer declaration
// let visualizer = null;

startButton.addEventListener("click", () => {
  // Check if visualizer exists in the global scope
  if (typeof visualizer === "undefined" || visualizer === null) {
    // Create a new visualizer instance
    visualizer = new AudioVisualizer();
    visualizer.init();
    startButton.style.display = "none";
  }
});
