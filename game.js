/**
 * BurgerTime Arcade 2D - Motor de Juego HTML5 Canvas
 * Totalmente compatible con Vercel para despliegue estático web.
 */

// =============================================================================
// 1. CONFIGURACIÓN Y CONSTANTES GLOBALES
// =============================================================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 640;
const COLS = 20;
const ROWS = 16;
const TILE_W = CANVAS_WIDTH / COLS;   // 40 px
const TILE_H = CANVAS_HEIGHT / ROWS;  // 40 px

const COLOR_BG = "#0f0f19";
const COLOR_PLATFORM = "#b45032";
const COLOR_PLATFORM_TOP = "#e68c5a";
const COLOR_LADDER = "#508cdc";
const COLOR_LADDER_RUNGS = "#8cbeff";
const COLOR_YELLOW = "#f8cc1b";
const COLOR_RED = "#eb3232";
const COLOR_WHITE = "#ffffff";
const COLOR_GRAY = "#78788c";
const COLOR_DARK_GRAY = "#282837";
const COLOR_GREEN = "#32dc5a";

// Diseño del Laberinto
// ' ' = Aire | 'P' = Plataforma | 'L' = Escalera | 'B' = Ambos (Intersección)
const LEVEL_LAYOUT = [
  "                    ", // Fila 0: HUD
  "                    ", // Fila 1
  "PPPPPPPPPPPPPPPPPPPP", // Fila 2: Plataforma Superior
  "   L            L   ", // Fila 3
  "   L            L   ", // Fila 4
  "PPPBPPPPPPPPPPPPBPPP", // Fila 5: Plataforma Nivel 2
  "       L    L       ", // Fila 6
  "       L    L       ", // Fila 7
  "PPPPPPPBPPPPBPPPPPPP", // Fila 8: Plataforma Nivel 3
  "   L            L   ", // Fila 9
  "   L            L   ", // Fila 10
  "PPPBPPPPPPPPPPPPBPPP", // Fila 11: Plataforma Nivel 4
  "       L    L       ", // Fila 12
  "       L    L       ", // Fila 13
  "PPPPPPPPPPPPPPPPPPPP", // Fila 14: Base con Platos
  "                    ", // Fila 15
];

// =============================================================================
// 2. SISTEMA DE AUDIO RETRO (Web Audio API)
// =============================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, gainVal = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  step() {
    this.playTone(180, "triangle", 0.05, 0.05);
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
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  burgerFall() {
    this.playTone(120, "square", 0.15, 0.12);
  }

  burgerLand() {
    this.playTone(80, "triangle", 0.2, 0.2);
  }

  stun() {
    this.playTone(440, "sawtooth", 0.3, 0.15);
  }

  hit() {
    this.playTone(90, "sawtooth", 0.4, 0.25);
  }

  win() {
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, "triangle", 0.3, 0.15), i * 150);
    });
  }

  gameOver() {
    const notes = [300, 240, 180, 120];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, "sawtooth", 0.35, 0.2), i * 180);
    });
  }
}

const SFX = new SoundFX();


// =============================================================================
// 3. GESTOR DE SPRITES Y ASSETS
// =============================================================================
class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = 0;
    this.total = 0;
  }

  loadImage(key, paths) {
    if (!Array.isArray(paths)) paths = [paths];
    this.total++;

    const tryNext = (index) => {
      if (index >= paths.length) {
        console.warn(`[AVISO] No se pudo cargar sprite para '${key}'. Se usará fallback.`);
        this.loaded++;
        return;
      }
      const img = new Image();
      img.src = paths[index];
      img.onload = () => {
        this.images[key] = img;
        this.loaded++;
      };
      img.onerror = () => {
        tryNext(index + 1);
      };
    };

    tryNext(0);
  }

  getImage(key) {
    return this.images[key] || null;
  }

  loadAll() {
    const prefixes = ["ASSETS/", "sprites/", "./ASSETS/", "./sprites/", ""];
    const register = (key, filenames) => {
      const candidates = [];
      for (const prefix of prefixes) {
        for (const fn of filenames) {
          candidates.push(prefix + fn);
        }
      }
      this.loadImage(key, candidates);
    };

    // Jugador Hombre
    register("hombre_idle", ["hombrefrente.png", "jugador_hombre.png"]);
    register("hombre_walk0", ["hombrecaminando.png", "jugador_hombre.png"]);
    register("hombre_walk1", ["hombrecaminando1.png", "jugador_hombre.png"]);
    register("hombre_walk2", ["hombrecaminando2.png", "jugador_hombre.png"]);
    register("hombre_walk3", ["hombrecaminando3.png", "jugador_hombre.png"]);
    register("hombre_salt", ["hombresal.png", "jugador_hombre.png"]);

    // Jugador Mujer
    register("mujer_idle", ["mujerfrente.png", "jugador_mujer.png"]);
    register("mujer_walk0", ["mujercaminando.png", "jugador_mujer.png"]);
    register("mujer_walk1", ["mujercaminando1.png", "jugador_mujer.png"]);
    register("mujer_walk2", ["mujercaminando2.png", "jugador_mujer.png"]);
    register("mujer_walk3", ["mujercaminando3.png", "jugador_mujer.png"]);
    register("mujer_salt", ["mujersal.png", "jugador_mujer.png"]);

    // Salchicha (Enemigo)
    register("sausage_idle", ["salchichafrente.png", "salchicha.png"]);
    register("sausage_walk0", ["salchichacaminando.png", "salchicha.png"]);
    register("sausage_walk1", ["salchichacaminando1.png", "salchicha.png"]);
    register("sausage_walk2", ["salchichacaminando2.png", "salchicha.png"]);
    register("sausage_walk3", ["salchichacaminando3.png", "salchicha.png"]);

    // Ingredientes de Hamburguesa
    register("pan_superior", ["arribapan.png", "pan_superior.png"]);
    register("lechuga", ["queso.png", "lechuga.png"]);
    register("carne", ["paty.png", "carne.png"]);
    register("pan_inferior", ["abajopan.png", "pan_inferior.png"]);
    register("bacon", ["bacon.png"]);
    register("mayonesa", ["mayonesa.png"]);
    register("cebolla", ["cebolla.png"]);

    // Sal
    register("sal", ["sal.png", "hombresal.png"]);
  }
}

const Assets = new AssetManager();
Assets.loadAll();


// =============================================================================
// 4. MAPA Y PLATAFORMAS
// =============================================================================
class LevelMap {
  constructor() {
    this.layout = LEVEL_LAYOUT;
    this.platforms = [];
    this.buildGeometry();
  }

  buildGeometry() {
    this.platforms = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const char = this.layout[r][c];
        if (char === "P" || char === "B") {
          this.platforms.push({
            x: c * TILE_W,
            y: r * TILE_H,
            w: TILE_W,
            h: TILE_H,
            top: r * TILE_H,
            bottom: (r + 1) * TILE_H,
            left: c * TILE_W,
            right: (c + 1) * TILE_W,
          });
        }
      }
    }
  }

  isLadder(col, row) {
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      const char = this.layout[row][col];
      return char === "L" || char === "B";
    }
    return false;
  }

  draw(ctx) {
    // Fondo Arcade
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dibujar Escaleras y Plataformas
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const char = this.layout[r][c];
        const x = c * TILE_W;
        const y = r * TILE_H;

        // Escalera
        if (char === "L" || char === "B") {
          ctx.fillStyle = COLOR_LADDER;
          ctx.fillRect(x + 10, y, 4, TILE_H);
          ctx.fillRect(x + TILE_W - 14, y, 4, TILE_H);

          ctx.strokeStyle = COLOR_LADDER_RUNGS;
          ctx.lineWidth = 2;
          for (let ry = y + 6; ry < y + TILE_H; ry += 10) {
            ctx.beginPath();
            ctx.moveTo(x + 10, ry);
            ctx.lineTo(x + TILE_W - 10, ry);
            ctx.stroke();
          }
        }

        // Plataforma
        if (char === "P" || char === "B") {
          ctx.fillStyle = COLOR_PLATFORM;
          ctx.fillRect(x, y, TILE_W, TILE_H);
          ctx.fillStyle = COLOR_PLATFORM_TOP;
          ctx.fillRect(x, y, TILE_W, 4);
        }
      }
    }

    // Platos base en Fila 14 (Cols 2 y 12)
    const plateY = 14 * TILE_H + 16;
    for (const pCol of [2, 12]) {
      const px = pCol * TILE_W;
      const pw = TILE_W * 4;

      ctx.fillStyle = "#dcdce6";
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, plateY, pw / 2 + 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#8c8ca0";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}


// =============================================================================
// 5. PROYECTIL DE SAL
// =============================================================================
class SaltProjectile {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = 8;
    this.w = 26;
    this.h = 26;
    this.alive = true;
    this.lifetime = 26;
  }

  update() {
    this.x += this.speed * this.direction;
    this.lifetime--;
    if (this.lifetime <= 0 || this.x < 0 || this.x > CANVAS_WIDTH) {
      this.alive = false;
    }
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx) {
    const sprite = Assets.getImage("sal");
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f8cc1b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}


// =============================================================================
// 6. PIEZA DE HAMBURGUESA
// =============================================================================
class BurgerPiece {
  constructor(type, col, row) {
    this.type = type;
    this.w = TILE_W * 4; // 160 px
    this.h = 20;
    this.x = col * TILE_W;
    this.y = row * TILE_H - this.h;
    this.falling = false;
    this.fallSpeed = 0;
    this.landedOnPlate = false;

    this.numSegments = 4;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  checkPlayerStep(playerRect) {
    if (this.falling || this.landedOnPlate) return;

    // Contacto vertical
    const playerBottom = playerRect.y + playerRect.h;
    if (
      Math.abs(playerBottom - this.y) <= 8 &&
      playerRect.x + playerRect.w > this.x &&
      playerRect.x < this.x + this.w
    ) {
      const segW = this.w / this.numSegments;
      const playerCenterX = playerRect.x + playerRect.w / 2;
      const segIdx = Math.floor((playerCenterX - this.x) / segW);

      if (segIdx >= 0 && segIdx < this.numSegments) {
        if (!this.stepped[segIdx]) {
          this.stepped[segIdx] = true;
          this.stepOffsets[segIdx] = 4;
          SFX.step();
        }
      }

      if (this.stepped.every(Boolean)) {
        this.triggerFall();
      }
    }
  }

  triggerFall() {
    this.falling = true;
    this.fallSpeed = 3.2;
    this.stepped = [false, false, false, false];
    this.stepOffsets = [0, 0, 0, 0];
    SFX.burgerFall();
  }

  update(allPieces, platforms) {
    if (this.falling) {
      this.fallSpeed = Math.min(this.fallSpeed + 0.35, 9.5);
      this.y += this.fallSpeed;

      const myBottom = this.y + this.h;
      let targetLandY = null;

      // 1. Plataforma debajo
      for (const plat of platforms) {
        if (
          myBottom >= plat.top &&
          myBottom <= plat.top + 16 &&
          this.x + this.w > plat.left &&
          this.x < plat.right
        ) {
          targetLandY = plat.top - this.h;
          break;
        }
      }

      // 2. Colisión con otra pieza inferior (Efecto en Cadena)
      for (const other of allPieces) {
        if (other === this) continue;
        const otherRect = other.getRect();
        if (
          this.x < otherRect.x + otherRect.w &&
          this.x + this.w > otherRect.x &&
          myBottom >= otherRect.y &&
          this.y < otherRect.y
        ) {
          if (!other.falling && !other.landedOnPlate) {
            other.triggerFall();
          }
          targetLandY = otherRect.y - this.h;
        }
      }

      if (targetLandY !== null && this.y >= targetLandY) {
        this.y = targetLandY;
        this.falling = false;
        this.fallSpeed = 0;
        SFX.burgerLand();

        // Verificar si llegó al plato base (Fila 14)
        const basePlateY = 14 * TILE_H - this.h;
        if (this.y >= basePlateY - 4) {
          this.y = basePlateY;
          this.landedOnPlate = true;
        }
      }
    }
  }

  draw(ctx) {
    const sprite = Assets.getImage(this.type);
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
    } else {
      // Fallback estilizado
      const colors = {
        pan_superior: "#e67e22",
        lechuga: "#27ae60",
        carne: "#795548",
        pan_inferior: "#d35400",
      };
      ctx.fillStyle = colors[this.type] || "#e67e22";
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h, 6);
      ctx.fill();
    }

    // Líneas de pisada
    const segW = this.w / this.numSegments;
    for (let i = 0; i < this.numSegments; i++) {
      if (this.stepOffsets[i] > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(this.x + i * segW, this.y + this.h - 4, segW, 4);
      }
    }
  }
}


// =============================================================================
// 7. HAMBURGUESA COMPLETA
// =============================================================================
class Burger {
  constructor(colX, id) {
    this.colX = colX;
    this.id = id;
    this.layers = ["pan_superior", "lechuga", "carne", "pan_inferior"];
    this.layerRows = [2, 5, 8, 11];
    this.pieces = [];

    for (let i = 0; i < this.layers.length; i++) {
      this.pieces.push(new BurgerPiece(this.layers[i], colX, this.layerRows[i]));
    }
  }

  isComplete() {
    return this.pieces.every((p) => p.landedOnPlate);
  }

  update(allPieces, platforms, playerRect) {
    for (const piece of this.pieces) {
      piece.checkPlayerStep(playerRect);
      piece.update(allPieces, platforms);
    }
  }

  draw(ctx) {
    for (const piece of this.pieces) {
      piece.draw(ctx);
    }
  }
}


// =============================================================================
// 8. JUGADOR
// =============================================================================
class Player {
  constructor(gender = "hombre") {
    this.gender = gender;
    this.w = 30;
    this.h = 38;
    this.speed = 3.3;
    this.lives = 3;
    this.saltCount = 5;
    this.maxSalt = 5;
    this.projectiles = [];

    this.facing = 1; // 1 = derecha, -1 = izquierda
    this.onLadder = false;
    this.stunned = false;
    this.stunTimer = 0;

    this.animTick = 0;
    this.animFrame = 0;
    this.currentAction = "idle";

    this.resetPosition();
  }

  resetPosition() {
    this.x = 1 * TILE_W + 5;
    this.y = 2 * TILE_H - this.h;
    this.vy = 0;
    this.onLadder = false;
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  throwSalt() {
    if (this.saltCount > 0) {
      this.saltCount--;
      const sx = this.facing === 1 ? this.x + this.w : this.x - 26;
      const sy = this.y + 6;
      this.projectiles.push(new SaltProjectile(sx, sy, this.facing));
      this.currentAction = "salt";
      this.animFrame = 0;
      SFX.throwSalt();
    }
  }

  handleInput(inputState, levelMap) {
    const col = Math.floor((this.x + this.w / 2) / TILE_W);
    const row = Math.floor((this.y + this.h / 2) / TILE_H);
    const rowFeet = Math.floor((this.y + this.h - 2) / TILE_H);

    const atLadder = levelMap.isLadder(col, row) || levelMap.isLadder(col, rowFeet);
    let moving = false;
    this.onLadder = false;

    // Horizontal
    if (inputState.left) {
      this.x -= this.speed;
      this.facing = -1;
      moving = true;
      this.currentAction = "walk";
    } else if (inputState.right) {
      this.x += this.speed;
      this.facing = 1;
      moving = true;
      this.currentAction = "walk";
    }

    // Vertical (en escalera)
    if (atLadder) {
      if (inputState.up) {
        this.y -= this.speed;
        this.vy = 0;
        this.onLadder = true;
        moving = true;
        this.currentAction = "walk";
      } else if (inputState.down) {
        this.y += this.speed;
        this.vy = 0;
        this.onLadder = true;
        moving = true;
        this.currentAction = "walk";
      }
    }

    if (!moving && this.currentAction !== "salt") {
      this.currentAction = "idle";
    }

    // Gravedad
    if (!this.onLadder) {
      this.vy = Math.min(this.vy + 0.45, 9.0);
      this.y += this.vy;
    } else {
      this.vy = 0;
    }

    // Colisión con Plataformas
    const playerRect = this.getRect();
    for (const plat of levelMap.platforms) {
      if (
        playerRect.x < plat.right &&
        playerRect.x + playerRect.w > plat.left &&
        playerRect.y + playerRect.h >= plat.top &&
        playerRect.y < plat.top
      ) {
        if (this.vy > 0 && playerRect.y + playerRect.h - this.vy <= plat.top + 8) {
          this.y = plat.top - this.h;
          this.vy = 0;
        }
      }
    }

    // Restringir a bordes
    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.w));
    if (this.y < TILE_H) this.y = TILE_H;
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
      // Parpadeo de invulnerabilidad
      return;
    }

    const g = this.gender;
    let sprite = null;

    if (this.currentAction === "salt") {
      sprite = Assets.getImage(`${g}_salt`);
    } else if (this.currentAction === "walk") {
      sprite = Assets.getImage(`${g}_walk${this.animFrame}`);
    } else {
      sprite = Assets.getImage(`${g}_idle`);
    }

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(this.x + this.w, this.y);
      ctx.scale(-1, 1);
      if (sprite) {
        ctx.drawImage(sprite, 0, 0, this.w, this.h);
      } else {
        this.drawFallback(ctx, 0, 0);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        this.drawFallback(ctx, this.x, this.y);
      }
    }
    ctx.restore();

    // Dibujar proyectiles
    for (const p of this.projectiles) p.draw(ctx);
  }

  drawFallback(ctx, x, y) {
    ctx.fillStyle = this.gender === "hombre" ? COLOR_YELLOW : "#ff78b4";
    ctx.fillRect(x, y, this.w, this.h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(x, y, this.w, this.h);
  }
}


// =============================================================================
// 9. ENEMIGO: LA SALCHICHA
// =============================================================================
class SausageEnemy {
  constructor(startCol = 17, startRow = 2) {
    this.startCol = startCol;
    this.startRow = startRow;
    this.w = 30;
    this.h = 38;
    this.speed = 1.8;
    this.facing = -1;
    this.stunned = false;
    this.stunTimer = 0;
    this.animTick = 0;
    this.animFrame = 0;
    this.onLadder = false;

    this.resetPosition();
  }

  resetPosition() {
    this.x = this.startCol * TILE_W;
    this.y = this.startRow * TILE_H - this.h;
    this.vy = 0;
    this.stunned = false;
    this.stunTimer = 0;
    this.onLadder = false;
  }

  stun(duration = 240) {
    this.stunned = true;
    this.stunTimer = duration; // 4 segundos a 60fps
    SFX.stun();
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(player, levelMap) {
    if (this.stunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) {
        this.stunned = false;
      }
      return;
    }

    // IA de persecución
    const col = Math.floor((this.x + this.w / 2) / TILE_W);
    const row = Math.floor((this.y + this.h / 2) / TILE_H);
    const rowFeet = Math.floor((this.y + this.h - 2) / TILE_H);

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const myX = this.x + this.w / 2;
    const myY = this.y + this.h / 2;

    const atLadder = levelMap.isLadder(col, row) || levelMap.isLadder(col, rowFeet);
    const dy = targetY - myY;
    const dx = targetX - myX;

    if (atLadder && Math.abs(dy) > 20) {
      this.onLadder = true;
      if (dy < 0) {
        this.y -= this.speed * 0.9;
      } else {
        this.y += this.speed * 0.9;
      }
      this.vy = 0;
    } else {
      this.onLadder = false;
      if (dx < -5) {
        this.x -= this.speed;
        this.facing = -1;
      } else if (dx > 5) {
        this.x += this.speed;
        this.facing = 1;
      }
    }

    // Gravedad
    if (!this.onLadder) {
      this.vy = Math.min(this.vy + 0.45, 9.0);
      this.y += this.vy;
    } else {
      this.vy = 0;
    }

    // Colisión con plataformas
    const enemyRect = this.getRect();
    for (const plat of levelMap.platforms) {
      if (
        enemyRect.x < plat.right &&
        enemyRect.x + enemyRect.w > plat.left &&
        enemyRect.y + enemyRect.h >= plat.top &&
        enemyRect.y < plat.top
      ) {
        if (this.vy > 0 && enemyRect.y + enemyRect.h - this.vy <= plat.top + 8) {
          this.y = plat.top - this.h;
          this.vy = 0;
        }
      }
    }

    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.w));

    // Animación
    this.animTick++;
    if (this.animTick >= 8) {
      this.animTick = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  draw(ctx) {
    let sprite = this.stunned
      ? Assets.getImage("sausage_idle")
      : Assets.getImage(`sausage_walk${this.animFrame}`);

    ctx.save();
    if (this.facing === -1) {
      ctx.translate(this.x + this.w, this.y);
      ctx.scale(-1, 1);
      if (sprite) {
        ctx.drawImage(sprite, 0, 0, this.w, this.h);
      } else {
        ctx.fillStyle = COLOR_RED;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    } else {
      if (sprite) {
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
      } else {
        ctx.fillStyle = COLOR_RED;
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    ctx.restore();

    // Efecto visual de aturdido / congelado
    if (this.stunned) {
      ctx.fillStyle = "rgba(52, 152, 219, 0.45)";
      ctx.fillRect(this.x, this.y, this.w, this.h);

      ctx.fillStyle = "#f8cc1b";
      ctx.font = "10px 'Press Start 2P', monospace";
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

    this.state = "SELECT"; // SELECT | PLAYING | WON | LOST
    this.selectedGender = "hombre";

    this.levelMap = new LevelMap();
    this.player = null;
    this.sausage = null;
    this.burgers = [];

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    this.bindEvents();
    this.initGame();
  }

  initGame() {
    this.player = new Player(this.selectedGender);
    this.sausage = new SausageEnemy(17, 2);
    this.burgers = [new Burger(2, 1), new Burger(12, 2)];
  }

  bindEvents() {
    // Teclado
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
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.inputState.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.inputState.right = true;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.inputState.up = true;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.inputState.down = true;
        if (e.key === " ") {
          e.preventDefault();
          this.player.throwSalt();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.inputState.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.inputState.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.inputState.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.inputState.down = false;
    });

    // Clic en Canvas
    this.canvas.addEventListener("click", (e) => {
      SFX.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      if (this.state === "SELECT") {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
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

    // Controles Móviles
    const setupTouchBtn = (id, onStart, onEnd) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        SFX.init();
        onStart();
      });
      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (onEnd) onEnd();
      });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        SFX.init();
        onStart();
      });
      el.addEventListener("mouseup", (e) => {
        e.preventDefault();
        if (onEnd) onEnd();
      });
    };

    setupTouchBtn("btnLeft", () => (this.inputState.left = true), () => (this.inputState.left = false));
    setupTouchBtn("btnRight", () => (this.inputState.right = true), () => (this.inputState.right = false));
    setupTouchBtn("btnUp", () => (this.inputState.up = true), () => (this.inputState.up = false));
    setupTouchBtn("btnDown", () => (this.inputState.down = true), () => (this.inputState.down = false));
    setupTouchBtn("btnSalt", () => {
      if (this.state === "PLAYING") this.player.throwSalt();
      else if (this.state === "WON" || this.state === "LOST") this.state = "SELECT";
    });

    // Toggle Sonido
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

    // Actualizar jugador
    this.player.handleInput(this.inputState, this.levelMap);
    this.player.update();

    // Actualizar enemigo
    this.sausage.update(this.player, this.levelMap);

    // Actualizar hamburguesas
    const allPieces = [];
    for (const b of this.burgers) allPieces.push(...b.pieces);
    for (const b of this.burgers) {
      b.update(allPieces, this.levelMap.platforms, this.player.getRect());
    }

    // Colisión Sal -> Salchicha
    const sausageRect = this.sausage.getRect();
    for (const salt of this.player.projectiles) {
      const sRect = salt.getRect();
      if (
        sRect.x < sausageRect.x + sausageRect.w &&
        sRect.x + sRect.w > sausageRect.x &&
        sRect.y < sausageRect.y + sausageRect.h &&
        sRect.y + sRect.h > sausageRect.y
      ) {
        this.sausage.stun(240); // 4 segundos
        salt.alive = false;
      }
    }

    // Colisión Pieza Cayendo -> Aplasta Salchicha
    for (const piece of allPieces) {
      if (piece.falling) {
        const pRect = piece.getRect();
        if (
          pRect.x < sausageRect.x + sausageRect.w &&
          pRect.x + pRect.w > sausageRect.x &&
          pRect.y < sausageRect.y + sausageRect.h &&
          pRect.y + pRect.h > sausageRect.y
        ) {
          this.sausage.stun(300);
        }
      }
    }

    // Colisión Salchicha -> Jugador
    if (!this.sausage.stunned && !this.player.stunned) {
      const pRect = this.player.getRect();
      if (
        pRect.x < sausageRect.x + sausageRect.w &&
        pRect.x + pRect.w > sausageRect.x &&
        pRect.y < sausageRect.y + sausageRect.h &&
        pRect.y + pRect.h > sausageRect.y
      ) {
        this.player.takeHit();
        this.player.resetPosition();
        this.sausage.resetPosition();
      }
    }

    // Comprobar Fin de Partida
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
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state === "SELECT") {
      this.drawSelectScreen();
      return;
    }

    // Dibujar Nivel
    this.levelMap.draw(this.ctx);

    // Dibujar Hamburguesas
    for (const b of this.burgers) b.draw(this.ctx);

    // Dibujar Enemigo y Jugador
    this.sausage.draw(this.ctx);
    this.player.draw(this.ctx);

    // Dibujar HUD
    this.drawHUD();

    // Dibujar Resultado si finalizó
    if (this.state === "WON" || this.state === "LOST") {
      this.drawResultScreen();
    }
  }

  drawHUD() {
    this.ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, 40);
    this.ctx.strokeStyle = "#464664";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 40);
    this.ctx.lineTo(CANVAS_WIDTH, 40);
    this.ctx.stroke();

    this.ctx.font = "14px 'Press Start 2P', monospace";
    this.ctx.textBaseline = "middle";

    // Vidas
    this.ctx.fillStyle = this.player.lives <= 1 ? COLOR_RED : COLOR_WHITE;
    this.ctx.fillText(`VIDAS: ${this.player.lives}/3`, 20, 20);

    for (let i = 0; i < this.player.lives; i++) {
      this.ctx.fillStyle = COLOR_RED;
      this.ctx.beginPath();
      this.ctx.arc(170 + i * 16, 20, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Sal
    this.ctx.fillStyle = this.player.saltCount > 0 ? COLOR_YELLOW : COLOR_GRAY;
    this.ctx.fillText(`SAL: ${this.player.saltCount}/5`, 320, 20);
    for (let i = 0; i < this.player.saltCount; i++) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(440 + i * 12, 14, 7, 12);
    }
  }

  drawSelectScreen() {
    this.ctx.fillStyle = COLOR_BG;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    // Título Retro
    this.ctx.textAlign = "center";
    this.ctx.font = "32px 'Press Start 2P', monospace";
    this.ctx.fillStyle = COLOR_YELLOW;
    this.ctx.fillText("BURGERTIME ARCADE", cx, 110);

    this.ctx.font = "14px 'Press Start 2P', monospace";
    this.ctx.fillStyle = COLOR_WHITE;
    this.ctx.fillText("SELECCIONA TU PERSONAJE", cx, 160);

    // Tarjeta Hombre
    const isH = this.selectedGender === "hombre";
    this.ctx.fillStyle = isH ? "#323250" : "#1e1e2d";
    this.ctx.strokeStyle = isH ? COLOR_YELLOW : COLOR_DARK_GRAY;
    this.ctx.lineWidth = isH ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 210, cy - 70, 180, 200, 12);
    this.ctx.fill();
    this.ctx.stroke();

    const imgH = Assets.getImage("hombre_idle");
    if (imgH) this.ctx.drawImage(imgH, cx - 165, cy - 50, 90, 115);

    this.ctx.font = "12px 'Press Start 2P', monospace";
    this.ctx.fillStyle = isH ? COLOR_YELLOW : COLOR_GRAY;
    this.ctx.fillText("HOMBRE [1]", cx - 120, cy + 105);

    // Tarjeta Mujer
    const isM = this.selectedGender === "mujer";
    this.ctx.fillStyle = isM ? "#323250" : "#1e1e2d";
    this.ctx.strokeStyle = isM ? COLOR_YELLOW : COLOR_DARK_GRAY;
    this.ctx.lineWidth = isM ? 4 : 2;
    this.ctx.beginPath();
    this.ctx.roundRect(cx + 30, cy - 70, 180, 200, 12);
    this.ctx.fill();
    this.ctx.stroke();

    const imgM = Assets.getImage("mujer_idle");
    if (imgM) this.ctx.drawImage(imgM, cx + 75, cy - 50, 90, 115);

    this.ctx.fillStyle = isM ? COLOR_YELLOW : COLOR_GRAY;
    this.ctx.fillText("MUJER [2]", cx + 120, cy + 105);

    // Instrucción
    this.ctx.fillStyle = "#8cb4ff";
    this.ctx.font = "11px 'Press Start 2P', monospace";
    this.ctx.fillText("Haz Clic o Presiona [ENTER] para Jugar", cx, CANVAS_HEIGHT - 60);
  }

  drawResultScreen() {
    this.ctx.fillStyle = "rgba(10, 10, 20, 0.88)";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    this.ctx.textAlign = "center";

    if (this.state === "WON") {
      this.ctx.font = "36px 'Press Start 2P', monospace";
      this.ctx.fillStyle = COLOR_GREEN;
      this.ctx.fillText("¡¡ GANASTE !!", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = COLOR_WHITE;
      this.ctx.fillText("¡Armaste las 2 hamburguesas!", cx, cy + 15);
    } else {
      this.ctx.font = "36px 'Press Start 2P', monospace";
      this.ctx.fillStyle = COLOR_RED;
      this.ctx.fillText("GAME OVER", cx, cy - 40);

      this.ctx.font = "13px 'Press Start 2P', monospace";
      this.ctx.fillStyle = COLOR_WHITE;
      this.ctx.fillText("¡La salchicha te ha atrapado!", cx, cy + 15);
    }

    this.ctx.fillStyle = COLOR_YELLOW;
    this.ctx.font = "11px 'Press Start 2P', monospace";
    this.ctx.fillText("Presiona [R] o [ENTER] para Reiniciar", cx, cy + 80);
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Iniciar Motor cuando cargue la página
window.addEventListener("load", () => {
  const game = new GameEngine();
  game.loop();
});
