/**
 * BurgerTime Arcade 2D - Motor Web Canvas
 * Estructura de mapa basada en el clásico BurgerTime de arcade, adaptada para 2 hamburguesas completas de 7 capas.
 */

// =============================================================================
// 1. CONSTANTES Y CONFIGURACIÓN
// =============================================================================
const CANVAS_W = 800;
const CANVAS_H = 720;

// Paleta Retro Arcade Auténtica
const C_BG = "#000000";
const C_PLATFORM_CYAN = "#00f0ff";
const C_PLATFORM_DARK = "#003b52";
const C_PLATFORM_ACCENT = "#0088b3";
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

  score() {
    this.playTone(880, "sine", 0.08, 0.08);
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
// 4. MAPA DE NIVELES (ESTRUCTURA BURGERTIME ARCADE)
// =============================================================================
class LevelStructure {
  constructor() {
    // 8 Pisos (7 pisos superiores + piso 8 de platos)
    this.floors = [
      { y: 105, name: "Piso 1" },
      { y: 180, name: "Piso 2" },
      { y: 255, name: "Piso 3" },
      { y: 330, name: "Piso 4" },
      { y: 405, name: "Piso 5" },
      { y: 480, name: "Piso 6" },
      { y: 555, name: "Piso 7" },
      { y: 630, name: "Piso 8 (Platos)" },
    ];

    this.floorThickness = 8;

    // Posición X de las 2 Hamburguesas
    this.burger1X = 140; // Columna Izquierda
    this.burger2X = 520; // Columna Derecha
    this.burgerWidth = 140;

    // Secciones de Plataformas horizontales (Walkways) al estilo del mapa arcade
    // { floorIdx, x1, x2 }
    this.platforms = [
      // Piso 0 (Y=105)
      { floorIdx: 0, x1: 30, x2: 770 },

      // Piso 1 (Y=180)
      { floorIdx: 1, x1: 30,  x2: 320 },
      { floorIdx: 1, x1: 350, x2: 450 },
      { floorIdx: 1, x1: 480, x2: 770 },

      // Piso 2 (Y=255)
      { floorIdx: 2, x1: 30,  x2: 240 },
      { floorIdx: 2, x1: 270, x2: 530 },
      { floorIdx: 2, x1: 560, x2: 770 },

      // Piso 3 (Y=330)
      { floorIdx: 3, x1: 30,  x2: 320 },
      { floorIdx: 3, x1: 350, x2: 450 },
      { floorIdx: 3, x1: 480, x2: 770 },

      // Piso 4 (Y=405)
      { floorIdx: 4, x1: 30,  x2: 240 },
      { floorIdx: 4, x1: 270, x2: 530 },
      { floorIdx: 4, x1: 560, x2: 770 },

      // Piso 5 (Y=480)
      { floorIdx: 5, x1: 30,  x2: 320 },
      { floorIdx: 5, x1: 350, x2: 450 },
      { floorIdx: 5, x1: 480, x2: 770 },

      // Piso 6 (Y=555)
      { floorIdx: 6, x1: 30,  x2: 770 },

      // Piso 7 (Base Y=630)
      { floorIdx: 7, x1: 30,  x2: 770 },
    ];

    // Escaleras verticales conectando los pisos (diseño auténtico del mapa arcade)
    this.ladders = [
      // Piso 0 a 1
      { x: 50,  topY: 105, bottomY: 180, w: 26 },
      { x: 300, topY: 105, bottomY: 180, w: 26 },
      { x: 390, topY: 105, bottomY: 180, w: 26 },
      { x: 490, topY: 105, bottomY: 180, w: 26 },
      { x: 730, topY: 105, bottomY: 180, w: 26 },

      // Piso 1 a 2
      { x: 100, topY: 180, bottomY: 255, w: 26 },
      { x: 210, topY: 180, bottomY: 255, w: 26 },
      { x: 390, topY: 180, bottomY: 255, w: 26 },
      { x: 590, topY: 180, bottomY: 255, w: 26 },
      { x: 690, topY: 180, bottomY: 255, w: 26 },

      // Piso 2 a 3
      { x: 50,  topY: 255, bottomY: 330, w: 26 },
      { x: 300, topY: 255, bottomY: 330, w: 26 },
      { x: 390, topY: 255, bottomY: 330, w: 26 },
      { x: 490, topY: 255, bottomY: 330, w: 26 },
      { x: 730, topY: 255, bottomY: 330, w: 26 },

      // Piso 3 a 4
      { x: 100, topY: 330, bottomY: 405, w: 26 },
      { x: 210, topY: 330, bottomY: 405, w: 26 },
      { x: 390, topY: 330, bottomY: 405, w: 26 },
      { x: 590, topY: 330, bottomY: 405, w: 26 },
      { x: 690, topY: 330, bottomY: 405, w: 26 },

      // Piso 4 a 5
      { x: 50,  topY: 405, bottomY: 480, w: 26 },
      { x: 300, topY: 405, bottomY: 480, w: 26 },
      { x: 390, topY: 405, bottomY: 480, w: 26 },
      { x: 490, topY: 405, bottomY: 480, w: 26 },
      { x: 730, topY: 405, bottomY: 480, w: 26 },

      // Piso 5 a 6
      { x: 100, topY: 480, bottomY: 555, w: 26 },
      { x: 210, topY: 480, bottomY: 555, w: 26 },
      { x: 390, topY: 480, bottomY: 555, w: 26 },
      { x: 590, topY: 480, bottomY: 555, w: 26 },
      { x: 690, topY: 480, bottomY: 555, w: 26 },

      // Piso 6 a 7 (Hacia los platos base)
      { x: 50,  topY: 555, bottomY: 630, w: 26 },
      { x: 300, topY: 555, bottomY: 630, w: 26 },
      { x: 390, topY: 555, bottomY: 630, w: 26 },
      { x: 490, topY: 555, bottomY: 630, w: 26 },
      { x: 730, topY: 555, bottomY: 630, w: 26 },
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
    // Fondo Negro Arcade
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Escaleras (Estilo auténtico con peldaños grises densos y rieles cyan)
    for (const lad of this.ladders) {
      const lx = lad.x;
      const lw = lad.w;
      const top = lad.topY;
      const btm = lad.bottomY;

      // Rieles laterales cyan
      ctx.fillStyle = C_LADDER_RAIL;
      ctx.fillRect(lx, top, 3, btm - top);
      ctx.fillRect(lx + lw - 3, top, 3, btm - top);

      // Peldaños grises horizontales
      ctx.fillStyle = C_LADDER_RUNG;
      for (let ry = top + 4; ry < btm; ry += 6) {
        ctx.fillRect(lx + 2, ry, lw - 4, 2);
      }
    }

    // 2. Plataformas (Vigas horizontales Cyan Brillante estilo Arcade BurgerTime)
    for (const p of this.platforms) {
      const fy = this.floors[p.floorIdx].y;
      const pw = p.x2 - p.x1;

      // Cuerpo de la viga
      ctx.fillStyle = C_PLATFORM_DARK;
      ctx.fillRect(p.x1, fy, pw, 6);

      // Riel superior cyan brillante
      ctx.fillStyle = C_PLATFORM_CYAN;
      ctx.fillRect(p.x1, fy, pw, 2);

      // Borde inferior cyan
      ctx.fillRect(p.x1, fy + 4, pw, 2);

      // Remaches verticales intermedios
      ctx.fillStyle = C_PLATFORM_CYAN;
      for (let rx = p.x1 + 8; rx < p.x2; rx += 16) {
        ctx.fillRect(rx, fy + 2, 2, 2);
      }
    }

    // 3. Platos de Servido en la Base (Y=630)
    const plateY = 630 + 4;
    for (const bx of [this.burger1X, this.burger2X]) {
      const pw = this.burgerWidth;
      const px = bx - 10;

      // Sombra
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2 + 10, plateY + 6, pw / 2 + 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plato Cerámica Retro Blanca
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2 + 10, plateY, pw / 2 + 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#00d0f0";
      ctx.lineWidth = 2;
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
  pan_superior: { name: "Pan Superior", sprite: "pan_superior", h: 36, overlap: 10, pts: 100 },
  cebolla:      { name: "Cebolla",      sprite: "cebolla",      h: 26, overlap: 12, pts: 80  },
  bacon:        { name: "Bacon",        sprite: "bacon",        h: 26, overlap: 10, pts: 80  },
  queso:        { name: "Queso",        sprite: "queso",        h: 22, overlap: 8,  pts: 60  },
  paty:         { name: "Paty",         sprite: "paty",         h: 28, overlap: 8,  pts: 100 },
  mayonesa:     { name: "Mayonesa",     sprite: "mayonesa",     h: 22, overlap: 10, pts: 60  },
  pan_inferior: { name: "Pan Inferior", sprite: "pan_inferior", h: 32, overlap: 0,  pts: 100 },
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
    this.landedOnPlate = (floorIndex === 7);

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

    // Detectar cuando el chef pasa caminando sobre el ingrediente
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

      // Al caminar por encima, cae automáticamente al piso de abajo
      const steppedCount = this.stepped.filter(Boolean).length;
      if (steppedCount >= 2 || this.stepped.every(Boolean)) {
        this.triggerFall(addScoreCallback);
      }
    }
  }

  triggerFall(addScoreCallback) {
    if (this.falling || this.landedOnPlate) return;

    if (this.floorIndex < this.level.floors.length - 1) {
      this.falling = true;
      this.fallSpeed = 3.8;
      this.targetFloorIndex = this.floorIndex + 1;
      this.stepped = [false, false, false, false];
      this.stepOffsets = [0, 0, 0, 0];
      SFX.burgerFall();
      if (addScoreCallback) addScoreCallback(50);
    }
  }

  update(allPieces, sausage, addScoreCallback) {
    if (this.falling) {
      this.fallSpeed = Math.min(this.fallSpeed + 0.45, 9.5);
      this.y += this.fallSpeed;

      // 1. Aplastar salchicha al caer
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

      // 2. Caída en cadena con ingredientes inferiores
      for (const other of allPieces) {
        if (other === this || other.startX !== this.startX) continue;
        if (other.floorIndex === this.targetFloorIndex && !other.falling && !other.landedOnPlate) {
          if (this.y + this.h >= other.y) {
            other.triggerFall(addScoreCallback);
          }
        }
      }

      // 3. Aterrizar en el piso inferior
      const targetFloorY = this.level.floors[this.targetFloorIndex].y;
      const landY = targetFloorY - this.h;

      if (this.y >= landY) {
        this.y = landY;
        this.floorIndex = this.targetFloorIndex;
        this.falling = false;
        this.fallSpeed = 0;
        this.stepped = [false, false, false, false];
        this.stepOffsets = [0, 0, 0, 0];
        SFX.burgerLand();

        if (this.floorIndex === this.level.floors.length - 1) {
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

    // Efecto visual de pisadas
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

    // Cada una de las 7 piezas empieza en su respectivo piso (0 a 6)
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
      const baseY = this.level.floors[7].y - this.pieces[6].h;
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
// 8. JUGADOR (CON NAVEGACIÓN FLUIDA EN EL MAPA ARCADE)
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
    this.x = 40;
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

      // Subir
      if (input.up) {
        this.y -= this.climbSpeed;
        moved = true;
        this.currentAction = "walk";

        if (feetY <= lad.topY + 4) {
          this.y = lad.topY - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
        }
      }
      // Bajar
      else if (input.down) {
        this.y += this.climbSpeed;
        moved = true;
        this.currentAction = "walk";

        if (feetY >= lad.bottomY) {
          this.y = lad.bottomY - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
        }
      }

      // Salir lateralmente
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
      // 2. Sobre Plataformas
      // Bajar Escalera
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

      // Subir Escalera
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

      // Movimiento Horizontal
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

        // Gravedad suave
        this.vy = Math.min(this.vy + 0.45, 9.0);
        this.y += this.vy;

        // Colisión con las plataformas del mapa
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

    this.x = Math.max(30, Math.min(this.x, CANVAS_W - 30 - this.w));
    if (this.y < 50) this.y = 50;
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
// 9. ENEMIGO: SALCHICHA (IA MEJORADA)
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
    this.x = 710;
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

    this.x = Math.max(30, Math.min(this.x, CANVAS_W - 30 - this.w));

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

    // Dibujar Estructura Arcade
    this.level.draw(this.ctx);

    // Dibujar Hamburguesas
    for (const b of this.burgers) b.draw(this.ctx);

    // Dibujar Personajes
    this.sausage.draw(this.ctx);
    this.player.draw(this.ctx);

    // HUD Arcade Auténtico
    this.drawHUD();

    if (this.state === "WON" || this.state === "LOST") {
      this.drawResultScreen();
    }
  }

  drawHUD() {
    this.ctx.font = "14px 'Press Start 2P', monospace";
    this.ctx.textBaseline = "top";

    // 1UP y SCORE (Rojo y Blanco)
    this.ctx.fillStyle = C_TEXT_RED;
    this.ctx.fillText("1UP", 50, 18);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.score).padStart(6, " "), 50, 38);

    // HI-SCORE (Rojo y Blanco)
    this.ctx.fillStyle = C_TEXT_RED;
    this.ctx.fillText("HI-SCORE", 310, 18);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.hiScore).padStart(6, " "), 330, 38);

    // PEPPER / SAL (Verde y Blanco)
    this.ctx.fillStyle = C_TEXT_GREEN;
    this.ctx.fillText("PEPPER", 620, 18);
    this.ctx.fillStyle = C_TEXT_WHITE;
    this.ctx.fillText(String(this.player.saltCount).padStart(5, " "), 640, 38);

    // Barra de Estado Inferior
    const botY = CANVAS_H - 30;

    // Vidas (Iconos de Chef)
    this.ctx.fillStyle = C_TEXT_YELLOW;
    this.ctx.font = "10px 'Press Start 2P', monospace";
    this.ctx.fillText("LIVES:", 40, botY + 5);
    for (let i = 0; i < this.player.lives; i++) {
      this.ctx.fillStyle = C_TEXT_RED;
      this.ctx.beginPath();
      this.ctx.arc(120 + i * 18, botY + 10, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Progreso Hamburguesas
    const completed = this.burgers.filter((b) => b.isComplete()).length;
    this.ctx.fillStyle = C_TEXT_GREEN;
    this.ctx.fillText(`BURGERS: ${completed}/2`, 600, botY + 5);
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

    // Tarjeta Hombre
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

    // Tarjeta Mujer
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
    this.ctx.fillText("Haz Clic o Presiona [ENTER] para Comenzar", cx, CANVAS_H - 70);
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
