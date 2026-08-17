/**
 * BurgerTime Arcade 2D - Motor Web Canvas
 * Con 7 capas completas de hamburguesa, físicas de caída, escaleras bidireccionales y estética arcade premium.
 */

// =============================================================================
// 1. CONSTANTES Y CONFIGURACIÓN
// =============================================================================
const CANVAS_W = 800;
const CANVAS_H = 700;

// Paleta Retro Arcade
const C_BG = "#0c0d14";
const C_GIRDER_BASE = "#1e3c72";
const C_GIRDER_LIGHT = "#2a5298";
const C_GIRDER_TOP = "#ffb300";
const C_GIRDER_RIVET = "#ffe082";
const C_LADDER_RAIL = "#4fc3f7";
const C_LADDER_RUNG = "#e1f5fe";
const C_YELLOW = "#f8cc1b";
const C_RED = "#e74c3c";
const C_GREEN = "#2ecc71";
const C_WHITE = "#ffffff";
const C_GRAY = "#8888a0";
const C_DARK = "#181824";

// =============================================================================
// 2. SISTEMA DE AUDIO SINTETIZADO (Web Audio API)
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
    this.playTone(220, "triangle", 0.04, 0.04);
  }

  throwSalt() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  burgerFall() {
    this.playTone(130, "sawtooth", 0.12, 0.12);
  }

  burgerLand() {
    this.playTone(85, "triangle", 0.18, 0.18);
  }

  stun() {
    this.playTone(480, "sawtooth", 0.25, 0.15);
  }

  hit() {
    this.playTone(95, "sawtooth", 0.35, 0.22);
  }

  win() {
    const notes = [261.6, 329.6, 392.0, 523.2, 659.2];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "triangle", 0.25, 0.15), i * 120);
    });
  }

  gameOver() {
    const notes = [280, 220, 160, 100];
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
    // 7 Capas de Hamburguesa (Exacto orden del usuario)
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

    // Proyectil Sal
    this.register("sal", ["sal.png", "hombresal.png"]);
  }
}

const Sprites = new SpriteManager();
Sprites.loadAll();


// =============================================================================
// 4. MAPA DE NIVELES (7 PISOS + BASE DE PLATOS)
// =============================================================================
class LevelStructure {
  constructor() {
    // Definición de las 8 plataformas (7 pisos + 1 base)
    // Cada piso tiene su coordenada Y
    this.floors = [
      { y: 100, name: "Piso 1 (Pan Arriba)" },
      { y: 178, name: "Piso 2 (Cebolla)" },
      { y: 256, name: "Piso 3 (Bacon)" },
      { y: 334, name: "Piso 4 (Queso)" },
      { y: 412, name: "Piso 5 (Paty)" },
      { y: 490, name: "Piso 6 (Mayonesa)" },
      { y: 568, name: "Piso 7 (Pan Abajo)" },
      { y: 646, name: "Piso 8 (Platos Base)" },
    ];

    this.floorThickness = 12;

    // Escaleras conectando los pisos (posicionadas estratégicamente para máxima fluidez)
    // topY, bottomY, x, w
    this.ladders = [
      // Piso 0 a 1
      { x: 70,  topY: 100, bottomY: 178, w: 32 },
      { x: 384, topY: 100, bottomY: 178, w: 32 },
      { x: 700, topY: 100, bottomY: 178, w: 32 },

      // Piso 1 a 2
      { x: 230, topY: 178, bottomY: 256, w: 32 },
      { x: 538, topY: 178, bottomY: 256, w: 32 },

      // Piso 2 a 3
      { x: 70,  topY: 256, bottomY: 334, w: 32 },
      { x: 384, topY: 256, bottomY: 334, w: 32 },
      { x: 700, topY: 256, bottomY: 334, w: 32 },

      // Piso 3 a 4
      { x: 230, topY: 334, bottomY: 412, w: 32 },
      { x: 538, topY: 334, bottomY: 412, w: 32 },

      // Piso 4 a 5
      { x: 70,  topY: 412, bottomY: 490, w: 32 },
      { x: 384, topY: 412, bottomY: 490, w: 32 },
      { x: 700, topY: 412, bottomY: 490, w: 32 },

      // Piso 5 a 6
      { x: 230, topY: 490, bottomY: 568, w: 32 },
      { x: 538, topY: 490, bottomY: 568, w: 32 },

      // Piso 6 a 7 (Hacia la base)
      { x: 70,  topY: 568, bottomY: 646, w: 32 },
      { x: 384, topY: 568, bottomY: 646, w: 32 },
      { x: 700, topY: 568, bottomY: 646, w: 32 },
    ];

    // Posición X de las 2 Hamburguesas
    this.burger1X = 100;
    this.burger2X = 540;
  }

  // Verifica si el jugador o enemigo está sobre o dentro de una escalera
  findLadderAt(cx, cy, range = 24) {
    for (const lad of this.ladders) {
      if (Math.abs(cx - (lad.x + lad.w / 2)) <= range) {
        // Rango vertical de la escalera
        if (cy >= lad.topY - 8 && cy <= lad.bottomY + 8) {
          return lad;
        }
      }
    }
    return null;
  }

  // Verifica si hay una escalera justo debajo para empezar a bajar
  findLadderBelow(cx, feetY, range = 24) {
    for (const lad of this.ladders) {
      if (Math.abs(cx - (lad.x + lad.w / 2)) <= range) {
        if (Math.abs(feetY - lad.topY) <= 10) {
          return lad;
        }
      }
    }
    return null;
  }

  draw(ctx) {
    // Fondo Arcade
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Dibujar Escaleras (Detrás de las plataformas)
    for (const lad of this.ladders) {
      const lx = lad.x;
      const lw = lad.w;
      const lh = lad.bottomY - lad.topY;

      // Rieles laterales metálicos con brillo
      ctx.fillStyle = C_LADDER_RAIL;
      ctx.fillRect(lx + 4, lad.topY, 4, lh);
      ctx.fillRect(lx + lw - 8, lad.topY, 4, lh);

      // Peldaños
      ctx.fillStyle = C_LADDER_RUNG;
      for (let ry = lad.topY + 6; ry < lad.bottomY; ry += 12) {
        ctx.fillRect(lx + 4, ry, lw - 12, 3);
      }
    }

    // 2. Dibujar Plataformas (Vigas metálicas estilo arcade industrial)
    for (const floor of this.floors) {
      const fy = floor.y;
      const fh = this.floorThickness;

      // Cuerpo de la viga
      ctx.fillStyle = C_GIRDER_BASE;
      ctx.fillRect(0, fy, CANVAS_W, fh);

      // Estructura en celosía / patrón de vigas
      ctx.fillStyle = C_GIRDER_LIGHT;
      for (let gx = 0; gx < CANVAS_W; gx += 28) {
        ctx.fillRect(gx, fy + 3, 14, fh - 6);
      }

      // Riel superior brillante donde pisan los personajes
      ctx.fillStyle = C_GIRDER_TOP;
      ctx.fillRect(0, fy, CANVAS_W, 3);

      // Remaches dorados
      ctx.fillStyle = C_GIRDER_RIVET;
      for (let rx = 14; rx < CANVAS_W; rx += 56) {
        ctx.beginPath();
        ctx.arc(rx, fy + fh / 2 + 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Dibujar los 2 Platos en la Base
    const plateY = 646 + 6;
    for (const bx of [this.burger1X, this.burger2X]) {
      const pw = 160;
      const px = bx - 10;

      // Sombra
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, plateY + 6, pw / 2 + 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plato Cerámica Retro
      ctx.fillStyle = "#e0e0ea";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, plateY, pw / 2 + 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#9fa8da";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Borde interior fino
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, plateY - 1, pw / 2 + 4, 5, 0, 0, Math.PI * 2);
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
    this.speed = 7.5;
    this.w = 30;
    this.h = 30;
    this.alive = true;
    this.lifetime = 24;
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
      ctx.arc(this.x + 15, this.y + 15, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// =============================================================================
// 6. PIEZA DE HAMBURGUESA INDIVIDUAL (7 CAPAS)
// =============================================================================
// Alturas y proporciones calibradas para formar la hamburguesa de la Imagen 2
const LAYER_CONFIGS = {
  pan_superior: { name: "Pan Superior", sprite: "pan_superior", h: 38, overlap: 10 },
  cebolla:      { name: "Cebolla",      sprite: "cebolla",      h: 28, overlap: 12 },
  bacon:        { name: "Bacon",        sprite: "bacon",        h: 28, overlap: 10 },
  queso:        { name: "Queso",        sprite: "queso",        h: 24, overlap: 8  },
  paty:         { name: "Paty",         sprite: "paty",         h: 30, overlap: 8  },
  mayonesa:     { name: "Mayonesa",     sprite: "mayonesa",     h: 24, overlap: 10 },
  pan_inferior: { name: "Pan Inferior", sprite: "pan_inferior", h: 34, overlap: 0  },
};

class IngredientPiece {
  constructor(layerKey, floorIndex, startX, levelStruct) {
    this.layerKey = layerKey;
    this.config = LAYER_CONFIGS[layerKey];
    this.floorIndex = floorIndex;
    this.startX = startX;
    this.level = levelStruct;

    this.w = 140;
    this.h = this.config.h;
    this.x = startX;
    this.y = this.level.floors[floorIndex].y - this.h;

    this.falling = false;
    this.fallSpeed = 0;
    this.landedOnPlate = false;
    this.stackIndex = -1; // posición en el plato

    this.numSegments = 4;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  checkPlayerStep(playerRect) {
    if (this.falling || this.landedOnPlate) return;

    const pFeet = playerRect.y + playerRect.h;
    const pCenter = playerRect.x + playerRect.w / 2;

    // Contacto vertical y horizontal
    if (
      Math.abs(pFeet - this.y) <= 10 &&
      playerRect.x + playerRect.w > this.x &&
      playerRect.x < this.x + this.w
    ) {
      const segW = this.w / this.numSegments;
      const segIdx = Math.floor((pCenter - this.x) / segW);

      if (segIdx >= 0 && segIdx < this.numSegments) {
        if (!this.stepped[segIdx]) {
          this.stepped[segIdx] = true;
          this.stepOffsets[segIdx] = 4;
          SFX.step();
        }
      }

      // Si se pisaron los 4 cuartos, la pieza cae
      if (this.stepped.every(Boolean)) {
        this.triggerFall();
      }
    }
  }

  triggerFall() {
    this.falling = true;
    this.fallSpeed = 3.5;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
    SFX.burgerFall();
  }

  update(allPieces, sausage) {
    if (this.falling) {
      this.fallSpeed = Math.min(this.fallSpeed + 0.4, 9.5);
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
          sausage.stun(300); // aturdido por 5 segundos
        }
      }

      // 2. Colisión en cadena con otra pieza inferior
      for (const other of allPieces) {
        if (other === this || other.startX !== this.startX) continue;
        const otherRect = other.getRect();
        if (
          this.y + this.h >= otherRect.y &&
          this.y < otherRect.y
        ) {
          if (!other.falling && !other.landedOnPlate) {
            other.triggerFall();
          }
        }
      }

      // 3. Verificar aterrizaje en el siguiente piso o en el plato base
      const nextFloorIndex = this.floorIndex + 1;
      if (nextFloorIndex < this.level.floors.length) {
        const targetFloorY = this.level.floors[nextFloorIndex].y;
        const landY = targetFloorY - this.h;

        if (this.y >= landY) {
          this.y = landY;
          this.floorIndex = nextFloorIndex;
          this.falling = false;
          this.fallSpeed = 0;
          SFX.burgerLand();

          // Si llegó al piso base (Piso 7 -> Platos en Y=646)
          if (nextFloorIndex === this.level.floors.length - 1) {
            this.landedOnPlate = true;
          }
        }
      }
    }
  }

  draw(ctx) {
    const sp = Sprites.get(this.config.sprite);
    if (sp) {
      ctx.drawImage(sp, this.x, this.y, this.w, this.h);
    } else {
      // Fallback estilizado
      const colors = {
        pan_superior: "#e67e22",
        cebolla:      "#f1c40f",
        bacon:        "#c0392b",
        queso:        "#f39c12",
        paty:         "#6d4c41",
        mayonesa:     "#fdfefe",
        pan_inferior: "#d35400",
      };
      ctx.fillStyle = colors[this.layerKey] || "#e67e22";
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 4);
      ctx.fill();
    }

    // Señales de pisada de cuartos
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
// Orden exacto de arriba a abajo en los pisos:
// Piso 0 (Top): pan_superior
// Piso 1: cebolla
// Piso 2: bacon
// Piso 3: queso
// Piso 4: paty
// Piso 5: mayonesa
// Piso 6: pan_inferior
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

    // Crear las 7 piezas en sus respectivos pisos iniciales (0 a 6)
    for (let i = 0; i < ORDERED_LAYERS.length; i++) {
      const piece = new IngredientPiece(ORDERED_LAYERS[i], i, burgerX, levelStruct);
      this.pieces.push(piece);
    }
  }

  isComplete() {
    return this.pieces.every((p) => p.landedOnPlate);
  }

  update(allPieces, sausage, playerRect) {
    for (const p of this.pieces) {
      p.checkPlayerStep(playerRect);
      p.update(allPieces, sausage);
    }

    // Auto-ensamblaje perfecto en el plato base (Imagen 2)
    // Cuando las piezas llegan al plato base, apilarlas con nesting
    if (this.pieces[6].landedOnPlate) {
      // pan_inferior en la base
      const baseY = this.level.floors[7].y - this.pieces[6].h;
      this.pieces[6].y = baseY;

      let currentTopY = baseY;

      // Orden en el plato: mayonesa(5), paty(4), queso(3), bacon(2), cebolla(1), pan_superior(0)
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
    // Dibujar de abajo a arriba para un orden de superposición perfecto
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      this.pieces[i].draw(ctx);
    }
  }
}


// =============================================================================
// 8. JUGADOR (CON ESCALERAS BIDIRECCIONALES FLUIDAS)
// =============================================================================
class Player {
  constructor(gender = "hombre", levelStruct) {
    this.gender = gender;
    this.level = levelStruct;

    this.w = 32;
    this.h = 42;
    this.speed = 3.4;
    this.climbSpeed = 3.0;

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
    // Iniciar en el piso superior (Piso 0)
    this.x = 20;
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
      const sx = this.facing === 1 ? this.x + this.w : this.x - 26;
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

    // -------------------------------------------------------------------------
    // LÓGICA DE ESCALERAS (SUBIR Y BAJAR)
    // -------------------------------------------------------------------------
    if (this.isClimbing && this.currentLadder) {
      const lad = this.currentLadder;

      // Centrado suave en la escalera
      const ladderCenterX = lad.x + lad.w / 2;
      this.x = ladderCenterX - this.w / 2;

      // Subir
      if (input.up) {
        this.y -= this.climbSpeed;
        moved = true;
        this.currentAction = "walk";

        // Si llegó arriba de la escalera, pisar el piso superior
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

        // Si llegó al piso inferior, pisar el piso
        if (feetY >= lad.bottomY) {
          this.y = lad.bottomY - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
        }
      }

      // Salir de la escalera moviéndose a la izquierda o derecha
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
      // -----------------------------------------------------------------------
      // MOVIMIENTO NORMAL SOBRE PLATAFORMAS
      // -----------------------------------------------------------------------

      // Intento de BAJAR una escalera
      if (input.down) {
        const ladderBelow = this.level.findLadderBelow(cx, feetY, 26);
        if (ladderBelow) {
          this.isClimbing = true;
          this.currentLadder = ladderBelow;
          this.x = ladderBelow.x + ladderBelow.w / 2 - this.w / 2;
          this.y += 6; // comenzar descenso
          moved = true;
          this.currentAction = "walk";
        }
      }

      // Intento de SUBIR una escalera
      if (input.up && !this.isClimbing) {
        const ladderNear = this.level.findLadderAt(cx, centerY, 26);
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

        // Colisión con las plataformas
        const pRect = this.getRect();
        for (const floor of this.level.floors) {
          const fy = floor.y;
          // Si cae sobre el piso
          if (
            this.vy > 0 &&
            pRect.y + pRect.h >= fy &&
            pRect.y + pRect.h - this.vy <= fy + 12
          ) {
            this.y = fy - this.h;
            this.vy = 0;
            break;
          }
        }
      }
    }

    if (!moved && this.currentAction !== "salt") {
      this.currentAction = "idle";
    }

    // Límites de pantalla
    this.x = Math.max(0, Math.min(this.x, CANVAS_W - this.w));
    if (this.y < 40) this.y = 40;
  }

  takeHit() {
    if (!this.stunned) {
      this.lives--;
      this.stunned = true;
      this.stunTimer = 120; // 2 segundos
      SFX.hit();
      return true;
    }
    return false;
  }

  update() {
    // Proyectiles
    for (const p of this.projectiles) p.update();
    this.projectiles = this.projectiles.filter((p) => p.alive);

    // Invulnerabilidad
    if (this.stunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) this.stunned = false;
    }

    // Animación
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
      return; // parpadeo
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
        ctx.fillStyle = g === "hombre" ? C_YELLOW : "#ff78b4";
        ctx.fillRect(0, 0, this.w, this.h);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        ctx.fillStyle = g === "hombre" ? C_YELLOW : "#ff78b4";
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    ctx.restore();

    for (const p of this.projectiles) p.draw(ctx);
  }
}


// =============================================================================
// 9. ENEMIGO: LA SALCHICHA (IA MEJORADA)
// =============================================================================
class SausageEnemy {
  constructor(levelStruct) {
    this.level = levelStruct;
    this.w = 32;
    this.h = 42;
    this.speed = 1.9;
    this.climbSpeed = 1.7;

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
    this.x = 720;
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

    // Si ya está trepando
    if (this.isClimbing && this.currentLadder) {
      const lad = this.currentLadder;
      this.x = lad.x + lad.w / 2 - this.w / 2;

      if (dy < -10) {
        this.y -= this.climbSpeed;
        if (this.y + this.h <= lad.topY + 4) {
          this.y = lad.topY - this.h;
          this.isClimbing = false;
        }
      } else if (dy > 10) {
        this.y += this.climbSpeed;
        if (this.y + this.h >= lad.bottomY) {
          this.y = lad.bottomY - this.h;
          this.isClimbing = false;
        }
      } else {
        this.isClimbing = false;
      }
    } else {
      // Decidir si debe subir o bajar escalera para acercarse verticalmente
      if (Math.abs(dy) > 25) {
        // Buscar escalera cercana
        const lad = this.level.findLadderAt(myCx, myCy, 45);
        if (lad) {
          if ((dy < 0 && myCy > lad.topY) || (dy > 0 && myCy < lad.bottomY)) {
            this.isClimbing = true;
            this.currentLadder = lad;
          }
        }
      }

      if (!this.isClimbing) {
        // Movimiento horizontal hacia el jugador
        if (dx < -4) {
          this.x -= this.speed;
          this.facing = -1;
        } else if (dx > 4) {
          this.x += this.speed;
          this.facing = 1;
        }

        // Gravedad
        this.vy = Math.min(this.vy + 0.45, 9.0);
        this.y += this.vy;

        for (const floor of this.level.floors) {
          if (
            this.vy > 0 &&
            this.y + this.h >= floor.y &&
            this.y + this.h - this.vy <= floor.y + 12
          ) {
            this.y = floor.y - this.h;
            this.vy = 0;
            break;
          }
        }
      }
    }

    this.x = Math.max(0, Math.min(this.x, CANVAS_W - this.w));

    // Animación
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
        ctx.fillStyle = C_RED;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        ctx.fillStyle = C_RED;
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    ctx.restore();

    // Efecto congelado
    if (this.stunned) {
      ctx.fillStyle = "rgba(52, 152, 219, 0.5)";
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = C_YELLOW;
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillText("★", this.x + 8, this.y - 4);
    }
  }
}


// =============================================================================
// 10. MOTOR PRINCIPAL Y CONTROL DE FLUJO
// =============================================================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.state = "SELECT"; // SELECT | PLAYING | WON | LOST
    this.selectedGender = "hombre";

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
      b.update(allPieces, this.sausage, this.player.getRect());
    }

    // Colisión Sal -> Salchicha
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
      }
    }

    // Colisión Salchicha -> Jugador
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
    this.ctx.fillStyle = "rgba(10, 10, 20, 0.9)";
    this.ctx.fillRect(0, 0, CANVAS_W, 42);
    this.ctx.strokeStyle = "#ffb300";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 42);
    this.ctx.lineTo(CANVAS_W, 42);
    this.ctx.stroke();

    this.ctx.font = "14px 'Press Start 2P', monospace";
    this.ctx.textBaseline = "middle";

    // Vidas (Con margen generoso para evitar recortes)
    this.ctx.fillStyle = this.player.lives <= 1 ? C_RED : C_WHITE;
    this.ctx.fillText(`VIDAS: ${this.player.lives}/3`, 24, 21);

    for (let i = 0; i < this.player.lives; i++) {
      this.ctx.fillStyle = C_RED;
      this.ctx.beginPath();
      this.ctx.arc(175 + i * 18, 21, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Sal
    this.ctx.fillStyle = this.player.saltCount > 0 ? C_YELLOW : C_GRAY;
    this.ctx.fillText(`SAL: ${this.player.saltCount}/5`, 340, 21);
    for (let i = 0; i < this.player.saltCount; i++) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(460 + i * 14, 15, 8, 12);
    }

    // Estado Hamburguesas
    const completedCount = this.burgers.filter((b) => b.isComplete()).length;
    this.ctx.fillStyle = C_GREEN;
    this.ctx.fillText(`BURGERS: ${completedCount}/2`, 610, 21);
  }

  drawSelectScreen() {
    this.ctx.fillStyle = C_BG;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    this.ctx.textAlign = "center";
    this.ctx.font = "28px 'Press Start 2P', monospace";
    this.ctx.fillStyle = C_YELLOW;
    this.ctx.fillText("BURGERTIME ARCADE", cx, 110);

    this.ctx.font = "13px 'Press Start 2P', monospace";
    this.ctx.fillStyle = C_WHITE;
    this.ctx.fillText("SELECCIONA TU CHEF", cx, 160);

    // Hombre
    const isH = this.selectedGender === "hombre";
    this.ctx.fillStyle = isH ? "#283593" : "#1a1a2e";
    this.ctx.strokeStyle = isH ? C_YELLOW : "#3f51b5";
    this.ctx.lineWidth = isH ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 210, cy - 70, 180, 210, 14);
    this.ctx.fill();
    this.ctx.stroke();

    const imgH = Sprites.get("hombre_idle");
    if (imgH) this.ctx.drawImage(imgH, cx - 165, cy - 50, 90, 120);

    this.ctx.font = "12px 'Press Start 2P', monospace";
    this.ctx.fillStyle = isH ? C_YELLOW : C_GRAY;
    this.ctx.fillText("HOMBRE [1]", cx - 120, cy + 110);

    // Mujer
    const isM = this.selectedGender === "mujer";
    this.ctx.fillStyle = isM ? "#283593" : "#1a1a2e";
    this.ctx.strokeStyle = isM ? C_YELLOW : "#3f51b5";
    this.ctx.lineWidth = isM ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx + 30, cy - 70, 180, 210, 14);
    this.ctx.fill();
    this.ctx.stroke();

    const imgM = Sprites.get("mujer_idle");
    if (imgM) this.ctx.drawImage(imgM, cx + 75, cy - 50, 90, 120);

    this.ctx.fillStyle = isM ? C_YELLOW : C_GRAY;
    this.ctx.fillText("MUJER [2]", cx + 120, cy + 110);

    // Instrucción
    this.ctx.fillStyle = "#80d8ff";
    this.ctx.font = "11px 'Press Start 2P', monospace";
    this.ctx.fillText("Haz Clic o Presiona [ENTER] para Comenzar", cx, CANVAS_H - 70);
  }

  drawResultScreen() {
    this.ctx.fillStyle = "rgba(10, 10, 20, 0.9)";
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    this.ctx.textAlign = "center";

    if (this.state === "WON") {
      this.ctx.font = "34px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_GREEN;
      this.ctx.fillText("¡¡ GANASTE !!", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_WHITE;
      this.ctx.fillText("¡Armaste las 2 hamburguesas completas!", cx, cy + 15);
    } else {
      this.ctx.font = "34px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_RED;
      this.ctx.fillText("GAME OVER", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = C_WHITE;
      this.ctx.fillText("¡La salchicha te ha alcanzado!", cx, cy + 15);
    }

    this.ctx.fillStyle = C_YELLOW;
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
