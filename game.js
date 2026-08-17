/**
 * BurgerTime Arcade 2D - Motor Web Canvas
 * Mapa con hamburguesas enmarcadas entre escaleras y platos ubicados en la base inferior para lucir el armado completo.
 */

// =============================================================================
// 1. CONSTANTES Y CONFIGURACIÓN
// =============================================================================
const CANVAS_W = 800;
const CANVAS_H = 760;

// Paleta Retro Arcade Auténtica
const C_BG = "#000000";
const C_PLATFORM_CYAN = "#00f0ff";
const C_PLATFORM_DARK = "#003b52";
const C_LADDER_RAIL = "#00d0f0";
const C_LADDER_RUNG = "#d8d8d8";
const C_TEXT_RED = "#ff2222";
const C_TEXT_WHITE = "#ffffff";
const C_TEXT_GREEN = "#22ff44";
const C_TEXT_YELLOW = "#ffff00";
const C_TEXT_GRAY = "#888888";

// =============================================================================
// 2. SISTEMA DE AUDIO RETRO 8-BITS (Web Audio API)
// =============================================================================
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type, dur, gainVal = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  step() {
    this.playTone(240, "triangle", 0.03, 0.04);
  }

  throwSalt() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  burgerFall() {
    this.playTone(150, "square", 0.12, 0.1);
  }

  burgerLand() {
    this.playTone(95, "triangle", 0.16, 0.15);
  }

  stun() {
    this.playTone(520, "sawtooth", 0.25, 0.15);
  }

  hit() {
    this.playTone(100, "sawtooth", 0.4, 0.25);
  }

  win() {
    const notes = [261.6, 329.6, 392.0, 523.2, 659.2, 784.0];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "triangle", 0.22, 0.15), i * 110);
    });
  }

  gameOver() {
    const notes = [320, 260, 200, 140, 90];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sawtooth", 0.3, 0.18), i * 150);
    });
  }
}

const SFX = new SoundSystem();


// =============================================================================
// 3. CARGADOR DE SPRITES
// =============================================================================
class SpriteManager {
  constructor() {
    this.images = {};
  }

  register(key, filenames) {
    if (!Array.isArray(filenames)) filenames = [filenames];
    const prefixes = ["ASSETS/", "sprites/", "./ASSETS/", "./sprites/", ""];
    const candidates = [];
    for (const p of prefixes) {
      for (const fn of filenames) candidates.push(p + fn);
    }

    const tryLoad = (idx) => {
      if (idx >= candidates.length) return;
      const img = new Image();
      img.src = candidates[idx];
      img.onload = () => {
        this.images[key] = img;
      };
      img.onerror = () => tryLoad(idx + 1);
    };

    tryLoad(0);
  }

  get(key) {
    return this.images[key] || null;
  }

  loadAll() {
    // 7 Capas de Hamburguesa
    this.register("pan_superior", ["arribapan.png", "pan_superior.png"]);
    this.register("cebolla",      ["cebolla.png"]);
    this.register("bacon",        ["bacon.png"]);
    this.register("queso",        ["queso.png"]);
    this.register("paty",         ["paty.png", "carne.png"]);
    this.register("mayonesa",     ["mayonesa.png"]);
    this.register("pan_inferior", ["abajopan.png", "pan_inferior.png"]);

    // Jugador Hombre
    this.register("hombre_idle",  ["hombrefrente.png", "jugador_hombre.png"]);
    this.register("hombre_walk0", ["hombrecaminando.png", "jugador_hombre.png"]);
    this.register("hombre_walk1", ["hombrecaminando1.png", "jugador_hombre.png"]);
    this.register("hombre_walk2", ["hombrecaminando2.png", "jugador_hombre.png"]);
    this.register("hombre_walk3", ["hombrecaminando3.png", "jugador_hombre.png"]);
    this.register("hombre_salt",  ["hombresal.png", "jugador_hombre.png"]);

    // Jugador Mujer
    this.register("mujer_idle",   ["mujerfrente.png", "jugador_mujer.png"]);
    this.register("mujer_walk0",  ["mujercaminando.png", "jugador_mujer.png"]);
    this.register("mujer_walk1",  ["mujercaminando1.png", "jugador_mujer.png"]);
    this.register("mujer_walk2",  ["mujercaminando2.png", "jugador_mujer.png"]);
    this.register("mujer_walk3",  ["mujercaminando3.png", "jugador_mujer.png"]);
    this.register("mujer_salt",   ["mujersal.png", "jugador_mujer.png"]);

    // Salchicha (Enemigo)
    this.register("sausage_idle",  ["salchichafrente.png", "salchicha.png"]);
    this.register("sausage_walk0", ["salchichacaminando.png", "salchicha.png"]);
    this.register("sausage_walk1", ["salchichacaminando1.png", "salchicha.png"]);
    this.register("sausage_walk2", ["salchichacaminando2.png", "salchicha.png"]);
    this.register("sausage_walk3", ["salchichacaminando3.png", "salchicha.png"]);

    // Sal
    this.register("sal", ["sal.png", "hombresal.png"]);
  }
}

const Sprites = new SpriteManager();
Sprites.loadAll();


// =============================================================================
// 4. MAPA DE NIVELES (HAMBURGUESAS ENMARCADAS ENTRE ESCALERAS)
// =============================================================================
class LevelStructure {
  constructor() {
    // 7 pisos para los 7 ingredientes + piso 7 de caminata inferior + plato base en Y=700
    this.floors = [
      { y: 95,  name: "Piso 1" },
      { y: 165, name: "Piso 2" },
      { y: 235, name: "Piso 3" },
      { y: 305, name: "Piso 4" },
      { y: 375, name: "Piso 5" },
      { y: 445, name: "Piso 6" },
      { y: 515, name: "Piso 7" },
      { y: 585, name: "Piso 8 (Plataforma Inferior)" },
    ];

    this.plateY = 700; // Platos más abajo con amplio espacio para la hamburguesa armada

    // Ancho y posiciones de las hamburguesas (Enmarcadas perfectamente entre escaleras)
    this.burgerWidth = 150;
    // Hamburguesa 1 (Izquierda): entre escalera X=76..102 y X=268..294
    this.burger1X = 110; 
    // Hamburguesa 2 (Derecha): entre escalera X=506..532 y X=698..724
    this.burger2X = 540;

    // Pasarelas / Plataformas estilo Arcade
    this.platforms = [
      // Piso 0 (Y=95)
      { floorIdx: 0, x1: 20, x2: 780 },

      // Piso 1 (Y=165)
      { floorIdx: 1, x1: 20,  x2: 320 },
      { floorIdx: 1, x1: 360, x2: 440 },
      { floorIdx: 1, x1: 480, x2: 780 },

      // Piso 2 (Y=235)
      { floorIdx: 2, x1: 20,  x2: 230 },
      { floorIdx: 2, x1: 270, x2: 530 },
      { floorIdx: 2, x1: 570, x2: 780 },

      // Piso 3 (Y=305)
      { floorIdx: 3, x1: 20,  x2: 320 },
      { floorIdx: 3, x1: 360, x2: 440 },
      { floorIdx: 3, x1: 480, x2: 780 },

      // Piso 4 (Y=375)
      { floorIdx: 4, x1: 20,  x2: 230 },
      { floorIdx: 4, x1: 270, x2: 530 },
      { floorIdx: 4, x1: 570, x2: 780 },

      // Piso 5 (Y=445)
      { floorIdx: 5, x1: 20,  x2: 320 },
      { floorIdx: 5, x1: 360, x2: 440 },
      { floorIdx: 5, x1: 480, x2: 780 },

      // Piso 6 (Y=515)
      { floorIdx: 6, x1: 20,  x2: 780 },

      // Piso 7 (Y=585 - Último piso caminable antes del plato)
      { floorIdx: 7, x1: 20,  x2: 780 },
    ];

    // Escaleras: Enmarcan exactamente cada columna de hamburguesa
    // Columna Burger 1: Escalera izquierda en X=76, Escalera derecha en X=268
    // Columna Burger 2: Escalera izquierda en X=506, Escalera derecha en X=698
    // Escalera Central en X=387, Escaleras Exteriores en X=24 y X=750
    this.ladders = [
      // Piso 0 a 1
      { x: 24,  topY: 95, bottomY: 165, w: 26 },
      { x: 76,  topY: 95, bottomY: 165, w: 26 },
      { x: 268, topY: 95, bottomY: 165, w: 26 },
      { x: 387, topY: 95, bottomY: 165, w: 26 },
      { x: 506, topY: 95, bottomY: 165, w: 26 },
      { x: 698, topY: 95, bottomY: 165, w: 26 },
      { x: 750, topY: 95, bottomY: 165, w: 26 },

      // Piso 1 a 2
      { x: 76,  topY: 165, bottomY: 235, w: 26 },
      { x: 268, topY: 165, bottomY: 235, w: 26 },
      { x: 387, topY: 165, bottomY: 235, w: 26 },
      { x: 506, topY: 165, bottomY: 235, w: 26 },
      { x: 698, topY: 165, bottomY: 235, w: 26 },

      // Piso 2 a 3
      { x: 24,  topY: 235, bottomY: 305, w: 26 },
      { x: 76,  topY: 235, bottomY: 305, w: 26 },
      { x: 268, topY: 235, bottomY: 305, w: 26 },
      { x: 387, topY: 235, bottomY: 305, w: 26 },
      { x: 506, topY: 235, bottomY: 305, w: 26 },
      { x: 698, topY: 235, bottomY: 305, w: 26 },
      { x: 750, topY: 235, bottomY: 305, w: 26 },

      // Piso 3 a 4
      { x: 76,  topY: 305, bottomY: 375, w: 26 },
      { x: 268, topY: 305, bottomY: 375, w: 26 },
      { x: 387, topY: 305, bottomY: 375, w: 26 },
      { x: 506, topY: 305, bottomY: 375, w: 26 },
      { x: 698, topY: 305, bottomY: 375, w: 26 },

      // Piso 4 a 5
      { x: 24,  topY: 375, bottomY: 445, w: 26 },
      { x: 76,  topY: 375, bottomY: 445, w: 26 },
      { x: 268, topY: 375, bottomY: 445, w: 26 },
      { x: 387, topY: 375, bottomY: 445, w: 26 },
      { x: 506, topY: 375, bottomY: 445, w: 26 },
      { x: 698, topY: 375, bottomY: 445, w: 26 },
      { x: 750, topY: 375, bottomY: 445, w: 26 },

      // Piso 5 a 6
      { x: 76,  topY: 445, bottomY: 515, w: 26 },
      { x: 268, topY: 445, bottomY: 515, w: 26 },
      { x: 387, topY: 445, bottomY: 515, w: 26 },
      { x: 506, topY: 445, bottomY: 515, w: 26 },
      { x: 698, topY: 445, bottomY: 515, w: 26 },

      // Piso 6 a 7
      { x: 24,  topY: 515, bottomY: 585, w: 26 },
      { x: 76,  topY: 515, bottomY: 585, w: 26 },
      { x: 268, topY: 515, bottomY: 585, w: 26 },
      { x: 387, topY: 515, bottomY: 585, w: 26 },
      { x: 506, topY: 515, bottomY: 585, w: 26 },
      { x: 698, topY: 515, bottomY: 585, w: 26 },
      { x: 750, topY: 515, bottomY: 585, w: 26 },
    ];
  }

  findLadderAt(cx, cy, range = 20) {
    for (const lad of this.ladders) {
      if (Math.abs(cx - (lad.x + lad.w / 2)) <= range) {
        if (cy >= lad.topY - 8 && cy <= lad.bottomY + 8) {
          return lad;
        }
      }
    }
    return null;
  }

  findLadderBelow(cx, feetY, range = 20) {
    for (const lad of this.ladders) {
      if (Math.abs(cx - (lad.x + lad.w / 2)) <= range) {
        if (Math.abs(feetY - lad.topY) <= 10) {
          return lad;
        }
      }
    }
    return null;
  }

  isPointOnPlatform(x, y) {
    for (const p of this.platforms) {
      const fy = this.floors[p.floorIdx].y;
      if (Math.abs(y - fy) <= 12 && x >= p.x1 && x <= p.x2) {
        return fy;
      }
    }
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Escaleras (Peldaños densos nítidos con rieles cyan)
    for (const lad of this.ladders) {
      const lx = lad.x;
      const lw = lad.w;
      const top = lad.topY;
      const btm = lad.bottomY;

      ctx.fillStyle = C_LADDER_RAIL;
      ctx.fillRect(lx, top, 3, btm - top);
      ctx.fillRect(lx + lw - 3, top, 3, btm - top);

      ctx.fillStyle = C_LADDER_RUNG;
      for (let ry = top + 4; ry < btm; ry += 6) {
        ctx.fillRect(lx + 2, ry, lw - 4, 2);
      }
    }

    // 2. Pasarelas / Vigas Cyan
    for (const p of this.platforms) {
      const fy = this.floors[p.floorIdx].y;
      const pw = p.x2 - p.x1;

      ctx.fillStyle = C_PLATFORM_DARK;
      ctx.fillRect(p.x1, fy, pw, 6);

      ctx.fillStyle = C_PLATFORM_CYAN;
      ctx.fillRect(p.x1, fy, pw, 2);
      ctx.fillRect(p.x1, fy + 4, pw, 2);

      for (let rx = p.x1 + 8; rx < p.x2; rx += 16) {
        ctx.fillRect(rx, fy + 2, 2, 2);
      }
    }

    // 3. Platos de Servido en la base inferior (Y = plateY)
    for (const bx of [this.burger1X, this.burger2X]) {
      const pw = this.burgerWidth + 16;
      const px = bx - 8;

      // Sombra
      ctx.fillStyle = "rgba(0, 240, 255, 0.15)";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, this.plateY + 6, pw / 2 + 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plato Cerámica Retro Blanca
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, this.plateY, pw / 2 + 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = C_PLATFORM_CYAN;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}


// =============================================================================
// 5. PROYECTIL DE SAL
// =============================================================================
class SaltCloud {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = 8.0;
    this.w = 26;
    this.h = 26;
    this.alive = true;
    this.lifetime = 22;
  }

  update() {
    this.x += this.speed * this.dir;
    this.lifetime--;
    if (this.lifetime <= 0 || this.x < 0 || this.x > CANVAS_W) {
      this.alive = false;
    }
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx) {
    const sp = Sprites.get("sal");
    if (sp) {
      ctx.drawImage(sp, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(this.x + 13, this.y + 13, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// =============================================================================
// 6. PIEZA DE HAMBURGUESA INDIVIDUAL (7 CAPAS)
// =============================================================================
const LAYER_CONFIGS = {
  pan_superior: { name: "Pan Superior", sprite: "pan_superior", h: 38, overlap: 10, pts: 100 },
  cebolla:      { name: "Cebolla",      sprite: "cebolla",      h: 28, overlap: 12, pts: 80  },
  bacon:        { name: "Bacon",        sprite: "bacon",        h: 28, overlap: 10, pts: 80  },
  queso:        { name: "Queso",        sprite: "queso",        h: 24, overlap: 8,  pts: 60  },
  paty:         { name: "Paty",         sprite: "paty",         h: 30, overlap: 8,  pts: 100 },
  mayonesa:     { name: "Mayonesa",     sprite: "mayonesa",     h: 24, overlap: 10, pts: 60  },
  pan_inferior: { name: "Pan Inferior", sprite: "pan_inferior", h: 34, overlap: 0,  pts: 100 },
};

class IngredientPiece {
  constructor(layerKey, floorIndex, startX, levelStruct) {
    this.layerKey = layerKey;
    this.config = LAYER_CONFIGS[layerKey];
    this.floorIndex = floorIndex;
    this.startX = startX;
    this.level = levelStruct;

    this.w = levelStruct.burgerWidth;
    this.h = this.config.h;
    this.x = startX;
    this.y = this.level.floors[floorIndex].y - this.h;

    this.falling = false;
    this.fallSpeed = 0;
    this.targetFloorIndex = floorIndex;
    this.landedOnPlate = false;

    this.numSegments = 4;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  checkPlayerStep(playerRect, addScoreCallback) {
    if (this.falling || this.landedOnPlate) return;

    const pFeet = playerRect.y + playerRect.h;
    const pCenter = playerRect.x + playerRect.w / 2;
    const floorY = this.level.floors[this.floorIndex].y;

    if (
      Math.abs(pFeet - floorY) <= 12 &&
      playerRect.x + playerRect.w > this.x &&
      playerRect.x < this.x + this.w
    ) {
      const segW = this.w / this.numSegments;
      const segIdx = Math.floor((pCenter - this.x) / segW);

      if (segIdx >= 0 && segIdx < this.numSegments) {
        if (!this.stepped[segIdx]) {
          this.stepped[segIdx] = true;
          this.stepOffsets[segIdx] = 3.5;
          SFX.step();
          if (addScoreCallback) addScoreCallback(10);
        }
      }

      const steppedCount = this.stepped.filter(Boolean).length;
      if (steppedCount >= 2 || this.stepped.every(Boolean)) {
        this.triggerFall(addScoreCallback);
      }
    }
  }

  triggerFall(addScoreCallback) {
    if (this.falling || this.landedOnPlate) return;

    this.falling = true;
    this.fallSpeed = 3.8;
    this.targetFloorIndex = this.floorIndex + 1;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
    SFX.burgerFall();
    if (addScoreCallback) addScoreCallback(50);
  }

  update(allPieces, sausage, addScoreCallback) {
    if (this.falling) {
      this.fallSpeed = Math.min(this.fallSpeed + 0.45, 9.5);
      this.y += this.fallSpeed;

      // 1. Aplastar salchicha
      if (sausage && !sausage.stunned) {
        const sRect = sausage.getRect();
        const myRect = this.getRect();
        if (
          myRect.x < sRect.x + sRect.w &&
          myRect.x + myRect.w > sRect.x &&
          myRect.y + myRect.h >= sRect.y &&
          myRect.y < sRect.y + sRect.h
        ) {
          sausage.stun(300);
          if (addScoreCallback) addScoreCallback(500);
        }
      }

      // 2. Caída en cadena
      for (const other of allPieces) {
        if (other === this || other.startX !== this.startX) continue;
        if (other.floorIndex === this.targetFloorIndex && !other.falling && !other.landedOnPlate) {
          if (this.y + this.h >= other.y) {
            other.triggerFall(addScoreCallback);
          }
        }
      }

      // 3. Aterrizaje
      // Si el destino es después del último piso caminable (Piso 7), aterriza en el plato base
      let targetY;
      if (this.targetFloorIndex >= this.level.floors.length) {
        targetY = this.level.plateY - this.h;
      } else {
        targetY = this.level.floors[this.targetFloorIndex].y - this.h;
      }

      if (this.y >= targetY) {
        this.y = targetY;
        this.floorIndex = this.targetFloorIndex;
        this.falling = false;
        this.fallSpeed = 0;
        this.stepped = [false, false, false, false];
        this.stepOffsets = [0, 0, 0, 0];
        SFX.burgerLand();

        if (this.floorIndex >= this.level.floors.length) {
          this.landedOnPlate = true;
          if (addScoreCallback) addScoreCallback(this.config.pts);
        }
      }
    }
  }

  draw(ctx) {
    const sp = Sprites.get(this.config.sprite);
    if (sp) {
      ctx.drawImage(sp, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 4);
      ctx.fill();
    }

    const segW = this.w / this.numSegments;
    for (let i = 0; i < this.numSegments; i++) {
      if (this.stepOffsets[i] > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(this.x + i * segW, this.y + this.h - 4, segW, 4);
      }
    }
  }
}


// =============================================================================
// 7. HAMBURGUESA COMPLETA (7 CAPAS)
// =============================================================================
const ORDERED_LAYERS = [
  "pan_superior",
  "cebolla",
  "bacon",
  "queso",
  "paty",
  "mayonesa",
  "pan_inferior",
];

class BurgerStack {
  constructor(burgerX, levelStruct) {
    this.burgerX = burgerX;
    this.level = levelStruct;
    this.pieces = [];

    // Cada pieza empieza en su piso (Piso 0 a 6)
    for (let i = 0; i < ORDERED_LAYERS.length; i++) {
      const piece = new IngredientPiece(ORDERED_LAYERS[i], i, burgerX, levelStruct);
      this.pieces.push(piece);
    }
  }

  isComplete() {
    return this.pieces.every((p) => p.landedOnPlate);
  }

  update(allPieces, sausage, playerRect, addScoreCallback) {
    for (const p of this.pieces) {
      p.checkPlayerStep(playerRect, addScoreCallback);
      p.update(allPieces, sausage, addScoreCallback);
    }

    // Auto-apilado perfecto en el plato base (Imagen 2)
    if (this.pieces[6].landedOnPlate) {
      const baseY = this.level.plateY - this.pieces[6].h;
      this.pieces[6].y = baseY;

      let currentTopY = baseY;

      // Orden en plato: Mayonesa(5), Paty(4), Queso(3), Bacon(2), Cebolla(1), Pan Superior(0)
      for (let i = 5; i >= 0; i--) {
        const piece = this.pieces[i];
        if (piece.landedOnPlate) {
          const overlap = piece.config.overlap;
          currentTopY = currentTopY - piece.h + overlap;
          piece.y = currentTopY;
        }
      }
    }
  }

  draw(ctx) {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      this.pieces[i].draw(ctx);
    }
  }
}


// =============================================================================
// 8. JUGADOR
// =============================================================================
class Player {
  constructor(gender = "hombre", levelStruct) {
    this.gender = gender;
    this.level = levelStruct;

    this.w = 30;
    this.h = 40;
    this.speed = 3.3;
    this.climbSpeed = 2.8;

    this.lives = 3;
    this.saltCount = 5;
    this.maxSalt = 5;
    this.projectiles = [];

    this.facing = 1;
    this.isClimbing = false;
    this.currentLadder = null;

    this.stunned = false;
    this.stunTimer = 0;

    this.animTick = 0;
    this.animFrame = 0;
    this.currentAction = "idle";

    this.resetPosition();
  }

  resetPosition() {
    this.x = 35;
    this.y = this.level.floors[0].y - this.h;
    this.vy = 0;
    this.isClimbing = false;
    this.currentLadder = null;
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  throwSalt() {
    if (this.saltCount > 0) {
      this.saltCount--;
      const sx = this.facing === 1 ? this.x + this.w : this.x - 24;
      const sy = this.y + 10;
      this.projectiles.push(new SaltCloud(sx, sy, this.facing));
      this.currentAction = "salt";
      this.animFrame = 0;
      SFX.throwSalt();
    }
  }

  handleInput(input) {
    const cx = this.x + this.w / 2;
    const feetY = this.y + this.h;
    const centerY = this.y + this.h / 2;

    let moved = false;

    // 1. En Escalera
    if (this.isClimbing && this.currentLadder) {
      const lad = this.currentLadder;
      const ladderCenterX = lad.x + lad.w / 2;
      this.x = ladderCenterX - this.w / 2;

      if (input.up) {
        this.y -= this.climbSpeed;
        moved = true;
        this.currentAction = "walk";

        if (feetY <= lad.topY + 4) {
          this.y = lad.topY - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
        }
      } else if (input.down) {
        this.y += this.climbSpeed;
        moved = true;
        this.currentAction = "walk";

        if (feetY >= lad.bottomY) {
          this.y = lad.bottomY - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
        }
      }

      if (input.left) {
        this.x -= this.speed;
        this.facing = -1;
        this.isClimbing = false;
        this.currentLadder = null;
        moved = true;
      } else if (input.right) {
        this.x += this.speed;
        this.facing = 1;
        this.isClimbing = false;
        this.currentLadder = null;
        moved = true;
      }

      this.vy = 0;
    } else {
      // 2. Sobre Plataforma
      if (input.down) {
        const ladderBelow = this.level.findLadderBelow(cx, feetY, 20);
        if (ladderBelow) {
          this.isClimbing = true;
          this.currentLadder = ladderBelow;
          this.x = ladderBelow.x + ladderBelow.w / 2 - this.w / 2;
          this.y += 6;
          moved = true;
          this.currentAction = "walk";
        }
      }

      if (input.up && !this.isClimbing) {
        const ladderNear = this.level.findLadderAt(cx, centerY, 20);
        if (ladderNear) {
          this.isClimbing = true;
          this.currentLadder = ladderNear;
          this.x = ladderNear.x + ladderNear.w / 2 - this.w / 2;
          this.y -= 4;
          moved = true;
          this.currentAction = "walk";
        }
      }

      if (!this.isClimbing) {
        if (input.left) {
          this.x -= this.speed;
          this.facing = -1;
          moved = true;
          this.currentAction = "walk";
        } else if (input.right) {
          this.x += this.speed;
          this.facing = 1;
          moved = true;
          this.currentAction = "walk";
        }

        this.vy = Math.min(this.vy + 0.45, 9.0);
        this.y += this.vy;

        const platY = this.level.isPointOnPlatform(cx, this.y + this.h);
        if (platY !== null && this.vy > 0 && this.y + this.h - this.vy <= platY + 10) {
          this.y = platY - this.h;
          this.vy = 0;
        }
      }
    }

    if (!moved && this.currentAction !== "salt") {
      this.currentAction = "idle";
    }

    this.x = Math.max(20, Math.min(this.x, CANVAS_W - 20 - this.w));
    if (this.y < 45) this.y = 45;
  }

  takeHit() {
    if (!this.stunned) {
      this.lives--;
      this.stunned = true;
      this.stunTimer = 120;
      SFX.hit();
      return true;
    }
    return false;
  }

  update() {
    for (const p of this.projectiles) p.update();
    this.projectiles = this.projectiles.filter((p) => p.alive);

    if (this.stunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) this.stunned = false;
    }

    this.animTick++;
    if (this.animTick >= 7) {
      this.animTick = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      if (this.currentAction === "salt") {
        this.currentAction = "idle";
      }
    }
  }

  draw(ctx) {
    if (this.stunned && Math.floor(Date.now() / 100) % 2 === 0) {
      return;
    }

    const g = this.gender;
    let sprite = null;

    if (this.currentAction === "salt") {
      sprite = Sprites.get(`${g}_salt`);
    } else if (this.currentAction === "walk") {
      sprite = Sprites.get(`${g}_walk${this.animFrame}`);
    } else {
      sprite = Sprites.get(`${g}_idle`);
    }

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(this.x + this.w, this.y);
      ctx.scale(-1, 1);
      if (sprite) {
        ctx.drawImage(sprite, 0, 0, this.w, this.h);
      } else {
        ctx.fillStyle = g === "hombre" ? C_TEXT_YELLOW : "#ff78b4";
        ctx.fillRect(0, 0, this.w, this.h);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        ctx.fillStyle = g === "hombre" ? C_TEXT_YELLOW : "#ff78b4";
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    ctx.restore();

    for (const p of this.projectiles) p.draw(ctx);
  }
}


// =============================================================================
// 9. ENEMIGO: SALCHICHA
// =============================================================================
class SausageEnemy {
  constructor(levelStruct) {
    this.level = levelStruct;
    this.w = 30;
    this.h = 40;
    this.speed = 1.8;
    this.climbSpeed = 1.6;

    this.facing = -1;
    this.stunned = false;
    this.stunTimer = 0;
    this.isClimbing = false;
    this.currentLadder = null;

    this.animTick = 0;
    this.animFrame = 0;

    this.resetPosition();
  }

  resetPosition() {
    this.x = 730;
    this.y = this.level.floors[0].y - this.h;
    this.vy = 0;
    this.stunned = false;
    this.stunTimer = 0;
    this.isClimbing = false;
    this.currentLadder = null;
  }

  stun(dur = 240) {
    this.stunned = true;
    this.stunTimer = dur;
    this.isClimbing = false;
    SFX.stun();
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(player) {
    if (this.stunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) this.stunned = false;
      return;
    }

    const myCx = this.x + this.w / 2;
    const myCy = this.y + this.h / 2;
    const pCx = player.x + player.w / 2;
    const pCy = player.y + player.h / 2;

    const dy = pCy - myCy;
    const dx = pCx - myCx;

    if (this.isClimbing && this.currentLadder) {
      const lad = this.currentLadder;
      this.x = lad.x + lad.w / 2 - this.w / 2;

      if (dy < -8) {
        this.y -= this.climbSpeed;
        if (this.y + this.h <= lad.topY + 4) {
          this.y = lad.topY - this.h;
          this.isClimbing = false;
        }
      } else if (dy > 8) {
        this.y += this.climbSpeed;
        if (this.y + this.h >= lad.bottomY) {
          this.y = lad.bottomY - this.h;
          this.isClimbing = false;
        }
      } else {
        this.isClimbing = false;
      }
    } else {
      if (Math.abs(dy) > 20) {
        const lad = this.level.findLadderAt(myCx, myCy, 35);
        if (lad) {
          if ((dy < 0 && myCy > lad.topY) || (dy > 0 && myCy < lad.bottomY)) {
            this.isClimbing = true;
            this.currentLadder = lad;
          }
        }
      }

      if (!this.isClimbing) {
        if (dx < -4) {
          this.x -= this.speed;
          this.facing = -1;
        } else if (dx > 4) {
          this.x += this.speed;
          this.facing = 1;
        }

        this.vy = Math.min(this.vy + 0.45, 9.0);
        this.y += this.vy;

        const platY = this.level.isPointOnPlatform(myCx, this.y + this.h);
        if (platY !== null && this.vy > 0 && this.y + this.h - this.vy <= platY + 10) {
          this.y = platY - this.h;
          this.vy = 0;
        }
      }
    }

    this.x = Math.max(20, Math.min(this.x, CANVAS_W - 20 - this.w));

    this.animTick++;
    if (this.animTick >= 8) {
      this.animTick = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  draw(ctx) {
    const sprite = this.stunned
      ? Sprites.get("sausage_idle")
      : Sprites.get(`sausage_walk${this.animFrame}`);

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(this.x + this.w, this.y);
      ctx.scale(-1, 1);
      if (sprite) {
        ctx.drawImage(sprite, 0, 0, this.w, this.h);
      } else {
        ctx.fillStyle = C_TEXT_RED;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        ctx.fillStyle = C_TEXT_RED;
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    ctx.restore();

    if (this.stunned) {
      ctx.fillStyle = "rgba(0, 240, 255, 0.5)";
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = C_TEXT_YELLOW;
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillText("★", this.x + 8, this.y - 4);
    }
  }
}


// =============================================================================
// 10. CONTROLADOR PRINCIPAL DEL JUEGO
// =============================================================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.state = "SELECT";
    this.selectedGender = "hombre";

    this.score = 0;
    this.hiScore = 28000;

    this.level = new LevelStructure();
    this.player = null;
    this.sausage = null;
    this.burgers = [];

    this.input = { up: false, down: false, left: false, right: false };

    this.bindEvents();
    this.initGame();
  }

  initGame() {
    this.player = new Player(this.selectedGender, this.level);
    this.sausage = new SausageEnemy(this.level);
    this.burgers = [
      new BurgerStack(this.level.burger1X, this.level),
      new BurgerStack(this.level.burger2X, this.level),
    ];
  }

  addScore(pts) {
    this.score += pts;
    if (this.score > this.hiScore) this.hiScore = this.score;
  }

  bindEvents() {
    window.addEventListener("keydown", (e) => {
      SFX.init();

      if (this.state === "SELECT") {
        if (e.key === "1" || e.key === "h" || e.key === "H" || e.key === "ArrowLeft") {
          this.selectedGender = "hombre";
        }
        if (e.key === "2" || e.key === "m" || e.key === "M" || e.key === "ArrowRight") {
          this.selectedGender = "mujer";
        }
        if (e.key === "Enter" || e.key === " ") {
          this.initGame();
          this.state = "PLAYING";
        }
        return;
      }

      if (this.state === "WON" || this.state === "LOST") {
        if (e.key === "r" || e.key === "R" || e.key === "Enter" || e.key === " ") {
          this.state = "SELECT";
        }
        return;
      }

      if (this.state === "PLAYING") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.input.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.input.right = true;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.input.up = true;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.input.down = true;
        if (e.key === " ") {
          e.preventDefault();
          this.player.throwSalt();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.input.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.input.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.input.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.input.down = false;
    });

    this.canvas.addEventListener("click", (e) => {
      SFX.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      if (this.state === "SELECT") {
        const cx = CANVAS_W / 2;
        const cy = CANVAS_H / 2;
        if (clickX >= cx - 210 && clickX <= cx - 30 && clickY >= cy - 70 && clickY <= cy + 130) {
          this.selectedGender = "hombre";
          this.initGame();
          this.state = "PLAYING";
        } else if (clickX >= cx + 30 && clickX <= cx + 210 && clickY >= cy - 70 && clickY <= cy + 130) {
          this.selectedGender = "mujer";
          this.initGame();
          this.state = "PLAYING";
        }
      } else if (this.state === "WON" || this.state === "LOST") {
        this.state = "SELECT";
      }
    });

    const setupBtn = (id, onStart, onEnd) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        SFX.init();
        onStart();
      };
      const end = (e) => {
        e.preventDefault();
        if (onEnd) onEnd();
      };
      el.addEventListener("touchstart", start);
      el.addEventListener("touchend", end);
      el.addEventListener("mousedown", start);
      el.addEventListener("mouseup", end);
    };

    setupBtn("btnLeft", () => (this.input.left = true), () => (this.input.left = false));
    setupBtn("btnRight", () => (this.input.right = true), () => (this.input.right = false));
    setupBtn("btnUp", () => (this.input.up = true), () => (this.input.up = false));
    setupBtn("btnDown", () => (this.input.down = true), () => (this.input.down = false));
    setupBtn("btnSalt", () => {
      if (this.state === "PLAYING") this.player.throwSalt();
      else if (this.state === "WON" || this.state === "LOST") this.state = "SELECT";
    });

    const audioBtn = document.getElementById("audioToggleBtn");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        SFX.init();
        SFX.enabled = !SFX.enabled;
        audioBtn.textContent = SFX.enabled ? "🔊 SONIDO" : "🔇 MUDO";
      });
    }
  }

  update() {
    if (this.state !== "PLAYING") return;

    this.player.handleInput(this.input);
    this.player.update();

    this.sausage.update(this.player);

    const allPieces = [];
    for (const b of this.burgers) allPieces.push(...b.pieces);
    for (const b of this.burgers) {
      b.update(allPieces, this.sausage, this.player.getRect(), (pts) => this.addScore(pts));
    }

    // Sal -> Salchicha
    const sRect = this.sausage.getRect();
    for (const salt of this.player.projectiles) {
      const pRect = salt.getRect();
      if (
        pRect.x < sRect.x + sRect.w &&
        pRect.x + pRect.w > sRect.x &&
        pRect.y < sRect.y + sRect.h &&
        pRect.y + pRect.h > sRect.y
      ) {
        this.sausage.stun(240);
        salt.alive = false;
        this.addScore(100);
      }
    }

    // Salchicha -> Jugador
    if (!this.sausage.stunned && !this.player.stunned) {
      const playerRect = this.player.getRect();
      if (
        playerRect.x < sRect.x + sRect.w &&
        playerRect.x + playerRect.w > sRect.x &&
        playerRect.y < sRect.y + sRect.h &&
        playerRect.y + playerRect.h > sRect.y
      ) {
        this.player.takeHit();
        this.player.resetPosition();
        this.sausage.resetPosition();
      }
    }

    if (this.player.lives <= 0) {
      this.state = "LOST";
      SFX.gameOver();
    }

    if (this.burgers.every((b) => b.isComplete())) {
      this.state = "WON";
      this.addScore(2000);
      SFX.win();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (this.state === "SELECT") {
      this.drawSelectScreen();
      return;
    }

    this.level.draw(this.ctx);

    for (const b of this.burgers) b.draw(this.ctx);

    this.sausage.draw(this.ctx);
    this.player.draw(this.ctx);

    this.drawHUD();

    if (this.state === "WON" || this.state === "LOST") {
      this.drawResultScreen();
    }
  }

  drawHUD() {
    this.ctx.font = "14px 'Press Start 2P', monospace";
    this.ctx.textBaseline = "top";

    // 1UP y SCORE
    this.ctx.fillStyle = C_TEXT_RED;
    this.ctx.fillText("1UP", 50, 16);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.score).padStart(6, " "), 50, 36);

    // HI-SCORE
    this.ctx.fillStyle = C_TEXT_RED;
    this.ctx.fillText("HI-SCORE", 310, 16);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.hiScore).padStart(6, " "), 330, 36);

    // PEPPER / SAL
    this.ctx.fillStyle = C_TEXT_GREEN;
    this.ctx.fillText("PEPPER", 620, 16);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.player.saltCount).padStart(5, " "), 640, 36);

    // Barra de Estado Inferior
    const botY = CANVAS_H - 24;

    this.ctx.fillStyle = C_TEXT_YELLOW;
    this.ctx.font = "10px 'Press Start 2P', monospace";
    this.ctx.fillText("LIVES:", 40, botY + 2);
    for (let i = 0; i < this.player.lives; i++) {
      this.ctx.fillStyle = C_TEXT_RED;
      this.ctx.beginPath();
      this.ctx.arc(120 + i * 18, botY + 7, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const completed = this.burgers.filter((b) => b.isComplete()).length;
    this.ctx.fillStyle = C_TEXT_GREEN;
    this.ctx.fillText(`BURGERS: ${completed}/2`, 600, botY + 2);
  }

  drawSelectScreen() {
    this.ctx.fillStyle = C_BG;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    this.ctx.textAlign = "center";
    this.ctx.font = "28px 'Press Start 2P', monospace";
    this.ctx.fillStyle = C_TEXT_YELLOW;
    this.ctx.fillText("BURGERTIME ARCADE", cx, 110);

    this.ctx.font = "13px 'Press Start 2P', monospace";
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText("SELECCIONA TU CHEF", cx, 160);

    const isH = this.selectedGender === "hombre";
    this.ctx.fillStyle = isH ? "#003b52" : "#11111e";
    this.ctx.strokeStyle = isH ? C_PLATFORM_CYAN : "#005577";
    this.ctx.lineWidth = isH ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 210, cy - 70, 180, 210, 12);
    this.ctx.fill();
    this.ctx.stroke();

    const imgH = Sprites.get("hombre_idle");
    if (imgH) this.ctx.drawImage(imgH, cx - 165, cy - 50, 90, 120);

    this.ctx.font = "12px 'Press Start 2P', monospace";
    this.ctx.fillStyle = isH ? C_TEXT_YELLOW : C_TEXT_GRAY;
    this.ctx.fillText("HOMBRE [1]", cx - 120, cy + 110);

    const isM = this.selectedGender === "mujer";
    this.ctx.fillStyle = isM ? "#003b52" : "#11111e";
    this.ctx.strokeStyle = isM ? C_PLATFORM_CYAN : "#005577";
    this.ctx.lineWidth = isM ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx + 30, cy - 70, 180, 210, 12);
    this.ctx.fill();
    this.ctx.stroke();

    const imgM = Sprites.get("mujer_idle");
    if (imgM) this.ctx.drawImage(imgM, cx + 75, cy - 50, 90, 120);

    this.ctx.fillStyle = isM ? C_TEXT_YELLOW : C_TEXT_GRAY;
    this.ctx.fillText("MUJER [2]", cx + 120, cy + 110);

    this.ctx.fillStyle = C_PLATFORM_CYAN;
    this.ctx.font = "11px 'Press Start 2P', monospace";
    this.ctx.fillText("Haz Clic o Presiona [ENTER] para Comenzar", cx, CANVAS_H - 80);
  }

  drawResultScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    this.ctx.textAlign = "center";

    if (this.state === "WON") {
      this.ctx.font = "34px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_TEXT_GREEN;
      this.ctx.fillText("¡¡ GANASTE !!", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_TEXT_WHITE;
      this.ctx.fillText("¡Armaste las 2 hamburguesas!", cx, cy + 15);
    } else {
      this.ctx.font = "34px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_TEXT_RED;
      this.ctx.fillText("GAME OVER", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_TEXT_WHITE;
      this.ctx.fillText("¡La salchicha te ha alcanzado!", cx, cy + 15);
    }

    this.ctx.fillStyle = C_TEXT_YELLOW;
    this.ctx.font = "11px 'Press Start 2P', monospace";
    this.ctx.fillText("Presiona [R] o [ENTER] para Jugar de Nuevo", cx, cy + 85);
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener("load", () => {
  const game = new GameEngine();
  game.loop();
});
