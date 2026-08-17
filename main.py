"""
BurgerTime Arcade 2D Game
Desarrollado en Python con Pygame.
Mecánica clásica inspirada en BurgerTime (1982).
"""

import pygame
import sys
import os
import math
import random

# ==============================================================================
# CONFIGURACIÓN GENERAL Y CONSTANTES
# ==============================================================================
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 640
FPS = 60

# Configuración del Grid
COLS = 20
ROWS = 16
TILE_WIDTH = SCREEN_WIDTH // COLS    # 40 px
TILE_HEIGHT = SCREEN_HEIGHT // ROWS  # 40 px

# Colores Retro Arcade
COLOR_BG = (15, 15, 25)
COLOR_PLATFORM = (180, 80, 50)
COLOR_PLATFORM_TOP = (230, 140, 90)
COLOR_LADDER = (80, 140, 220)
COLOR_LADDER_RUNGS = (140, 190, 255)
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_RED = (235, 50, 50)
COLOR_GREEN = (50, 220, 90)
COLOR_YELLOW = (255, 215, 0)
COLOR_ORANGE = (255, 140, 0)
COLOR_BROWN = (140, 70, 20)
COLOR_GRAY = (120, 120, 140)
COLOR_DARK_GRAY = (40, 40, 55)

# Carpetas de búsqueda de Sprites (Deduplicadas y Normalizadas)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_candidate_dirs = [
    os.path.join(BASE_DIR, "sprites"),
    os.path.join(BASE_DIR, "ASSETS"),
    os.path.join(BASE_DIR, "assets"),
]
SPRITE_DIRS = []
for d in _candidate_dirs:
    norm_d = os.path.normcase(os.path.abspath(d))
    if norm_d not in [os.path.normcase(os.path.abspath(x)) for x in SPRITE_DIRS]:
        SPRITE_DIRS.append(d)

# Inicialización de Pygame
pygame.init()
pygame.font.init()

# Fuentes
FONT_TITLE = pygame.font.SysFont("Impact, Arial Black, sans-serif", 46)
FONT_SUBTITLE = pygame.font.SysFont("Arial, sans-serif", 24, bold=True)
FONT_HUD = pygame.font.SysFont("Consolas, Courier, monospace", 20, bold=True)
FONT_MSG = pygame.font.SysFont("Impact, Arial Black, sans-serif", 56)


# ==============================================================================
# GESTOR DE RECURSOS Y SPRITES (CON FALLBACK RESILIENTE)
# ==============================================================================
class ResourceManager:
    """
    Carga de sprites con tolerancia a fallos.
    Busca en varias carpetas y nombres alternativos.
    Si no encuentra la imagen, genera una superficie procedural estilizada.
    """
    _cache = {}

    @classmethod
    def load_image(cls, names, size=None, fallback_color=COLOR_ORANGE, shape="rect"):
        if isinstance(names, str):
            names = [names]

        cache_key = (tuple(names), size)
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        image = None
        loaded_path = None

        # Intentar cargar desde las rutas posibles
        for folder in SPRITE_DIRS:
            if not os.path.isdir(folder):
                continue
            for name in names:
                full_path = os.path.join(folder, name)
                if os.path.isfile(full_path):
                    try:
                        loaded = pygame.image.load(full_path)
                        if pygame.display.get_surface() is not None:
                            image = loaded.convert_alpha()
                        else:
                            image = loaded
                        loaded_path = full_path
                        break
                    except Exception as e:
                        print(f"[ERROR] Falló al cargar '{full_path}': {e}")
            if image is not None:
                break

        # Si se encontró la imagen
        if image is not None:
            if size is not None:
                image = pygame.transform.smoothscale(image, size)
            cls._cache[cache_key] = image
            return image

        # Si no se encontró, emitir aviso en consola y generar fallback
        print(f"[AVISO] Sprite no encontrado para {names}. Usando gráfico generado de respaldo.")
        w, h = size if size is not None else (TILE_WIDTH, TILE_HEIGHT)
        surf = pygame.Surface((w, h), pygame.SRCALPHA)

        if shape == "rect":
            pygame.draw.rect(surf, fallback_color, (0, 0, w, h), border_radius=4)
            pygame.draw.rect(surf, COLOR_WHITE, (0, 0, w, h), 2, border_radius=4)
        elif shape == "circle":
            pygame.draw.ellipse(surf, fallback_color, (0, 0, w, h))
            pygame.draw.ellipse(surf, COLOR_WHITE, (0, 0, w, h), 2)
        elif shape == "burger_bun_top":
            pygame.draw.ellipse(surf, fallback_color, (0, 0, w, h * 2))
            surf_cut = pygame.Surface((w, h), pygame.SRCALPHA)
            surf_cut.blit(surf, (0, 0))
            surf = surf_cut
        else:
            pygame.draw.rect(surf, fallback_color, (0, 0, w, h))

        cls._cache[cache_key] = surf
        return surf


# ==============================================================================
# ESTRUCTURA DEL MAPA DE NIVEL
# ==============================================================================
# ' ' = Aire
# 'P' = Plataforma
# 'L' = Escalera
# 'B' = Plataforma + Escalera (Intersección)
LEVEL_LAYOUT = [
    "                    ",  # Fila 0: HUD Superior
    "                    ",  # Fila 1
    "PPPPPPPPPPPPPPPPPPPP",  # Fila 2: Plataforma Nivel 1 (Hamburguesa Superior)
    "   L            L   ",  # Fila 3
    "   L            L   ",  # Fila 4
    "PPPBPPPPPPPPPPPPBPPP",  # Fila 5: Plataforma Nivel 2
    "       L    L       ",  # Fila 6
    "       L    L       ",  # Fila 7
    "PPPPPPPBPPPPBPPPPPPP",  # Fila 8: Plataforma Nivel 3
    "   L            L   ",  # Fila 9
    "   L            L   ",  # Fila 10
    "PPPBPPPPPPPPPPPPBPPP",  # Fila 11: Plataforma Nivel 4
    "       L    L       ",  # Fila 12
    "       L    L       ",  # Fila 13
    "PPPPPPPPPPPPPPPPPPPP",  # Fila 14: Plataforma Base con Platos
    "                    ",  # Fila 15: Margen Inferior
]


# ==============================================================================
# CLASE PROYECTIL / EFECTO: SAL
# ==============================================================================
class SaltEffect(pygame.sprite.Sprite):
    """Proyectil de nube de sal para aturdir al enemigo."""
    def __init__(self, x, y, direction):
        super().__init__()
        self.direction = direction
        self.speed = 7
        self.lifetime = 24  # frames de vida
        self.size = (28, 28)
        
        # Cargar sprite de sal
        self.image = ResourceManager.load_image(
            ["sal.png", "hombresal.png", "mujersal.png"],
            size=self.size,
            fallback_color=(240, 240, 255),
            shape="circle"
        )
        self.rect = self.image.get_rect(center=(x, y))

    def update(self):
        self.rect.x += self.speed * self.direction
        self.lifetime -= 1
        if self.lifetime <= 0 or self.rect.right < 0 or self.rect.left > SCREEN_WIDTH:
            self.kill()

    def draw(self, surface):
        surface.blit(self.image, self.rect)


# ==============================================================================
# CLASE INGREDIENTE DE HAMBURGUESA
# ==============================================================================
class BurgerPiece:
    """
    Representa una pieza completa de la hamburguesa dividida en 4 secciones.
    Cuando el jugador camina sobre ella, los segmentos se pisan y cae.
    """
    WIDTH = TILE_WIDTH * 4   # 160 px de ancho
    HEIGHT = 20              # Altura de cada capa

    def __init__(self, layer_type, col, row, target_plate_col):
        self.layer_type = layer_type
        self.col = col
        self.row = row
        self.target_plate_col = target_plate_col
        self.x = float(col * TILE_WIDTH)
        self.y = float(row * TILE_HEIGHT - self.HEIGHT)
        
        self.falling = False
        self.fall_speed = 0.0
        self.landed_on_plate = False
        
        # 4 segmentos para pisar
        self.num_segments = 4
        self.stepped_segments = [False] * self.num_segments
        self.segment_offsets = [0.0] * self.num_segments
        
        # Carga del sprite según tipo de ingrediente
        self.image = self._load_ingredient_sprite(layer_type)

    def _load_ingredient_sprite(self, layer_type):
        name_map = {
            "pan_superior": (["pan_superior.png", "arribapan.png"], COLOR_ORANGE, "burger_bun_top"),
            "lechuga":      (["lechuga.png", "queso.png"], COLOR_GREEN, "rect"),
            "carne":        (["carne.png", "paty.png"], COLOR_BROWN, "rect"),
            "pan_inferior": (["pan_inferior.png", "abajopan.png"], COLOR_ORANGE, "rect"),
        }
        filenames, fb_color, fb_shape = name_map.get(layer_type, (["paty.png"], COLOR_BROWN, "rect"))
        return ResourceManager.load_image(
            filenames,
            size=(self.WIDTH, self.HEIGHT),
            fallback_color=fb_color,
            shape=fb_shape
        )

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.WIDTH, self.HEIGHT)

    def check_player_step(self, player_rect):
        """Verifica si el jugador camina sobre la pieza y pisa segmentos."""
        if self.falling or self.landed_on_plate:
            return

        # Tolerancia vertical para estar pisando el ingrediente
        if abs(player_rect.bottom - self.rect.top) <= 8 and (player_rect.right > self.rect.left and player_rect.left < self.rect.right):
            seg_w = self.WIDTH / self.num_segments
            player_center_x = player_rect.centerx
            seg_idx = int((player_center_x - self.x) // seg_w)
            if 0 <= seg_idx < self.num_segments:
                if not self.stepped_segments[seg_idx]:
                    self.stepped_segments[seg_idx] = True
                    self.segment_offsets[seg_idx] = 4.0

            # Si se pisaron todos los 4 segmentos, la pieza cae
            if all(self.stepped_segments):
                self.trigger_fall()

    def trigger_fall(self):
        """Inicia la caída de la pieza."""
        self.falling = True
        self.fall_speed = 3.0
        self.stepped_segments = [False] * self.num_segments
        self.segment_offsets = [0.0] * self.num_segments

    def update(self, all_pieces, platform_rects):
        if self.falling:
            self.fall_speed = min(self.fall_speed + 0.35, 9.0)
            self.y += self.fall_speed

            curr_rect = self.rect
            target_land_y = None

            # 1. Chequear si aterriza en una plataforma inferior
            for plat in platform_rects:
                # Comprobar si la base de la pieza cruzó la parte superior de la plataforma
                if (curr_rect.bottom >= plat.top and curr_rect.bottom <= plat.top + 16 and
                        curr_rect.right > plat.left and curr_rect.left < plat.right):
                    target_land_y = float(plat.top - self.HEIGHT)
                    break

            # 2. Chequear colisión en cadena con otra pieza inferior
            for other in all_pieces:
                if other is self:
                    continue
                if (curr_rect.colliderect(other.rect) and 
                        curr_rect.bottom >= other.rect.top and 
                        curr_rect.top < other.rect.top):
                    # Si la pieza de abajo no está cayendo, la empuja hacia abajo
                    if not other.falling and not other.landed_on_plate:
                        other.trigger_fall()
                    target_land_y = float(other.rect.top - self.HEIGHT)

            # Si aterriza
            if target_land_y is not None and self.y >= target_land_y:
                self.y = target_land_y
                self.falling = False
                self.fall_speed = 0.0

                # Verificar si llegó a la bandeja/plato final (Fila 14)
                base_plate_y = 14 * TILE_HEIGHT - self.HEIGHT
                if self.y >= base_plate_y - 2:
                    self.y = base_plate_y
                    self.landed_on_plate = True

    def draw(self, surface):
        surface.blit(self.image, (int(self.x), int(self.y)))
        
        # Efecto visual de segmentos pisados
        seg_w = self.WIDTH // self.num_segments
        for i, offset in enumerate(self.segment_offsets):
            if offset > 0:
                pygame.draw.line(
                    surface,
                    (50, 20, 10),
                    (int(self.x + i * seg_w), int(self.y + self.HEIGHT - 2)),
                    (int(self.x + (i + 1) * seg_w), int(self.y + self.HEIGHT - 2)),
                    3
                )


# ==============================================================================
# CLASE HAMBURGUESA (CONJUNTO DE 4 PIEZAS)
# ==============================================================================
class Burger:
    """Conjunto de piezas: Pan Superior, Lechuga/Queso, Carne, Pan Inferior."""
    LAYERS = ["pan_superior", "lechuga", "carne", "pan_inferior"]
    # Filas iniciales para cada capa en el laberinto
    LAYER_ROWS = [2, 5, 8, 11]

    def __init__(self, col_x, burger_id):
        self.col_x = col_x
        self.burger_id = burger_id
        self.pieces = []
        
        for layer_type, row in zip(self.LAYERS, self.LAYER_ROWS):
            piece = BurgerPiece(layer_type, col_x, row, col_x)
            self.pieces.append(piece)

    def is_complete(self):
        """La hamburguesa está completa cuando todas sus piezas están apiladas abajo."""
        return all(p.landed_on_plate for p in self.pieces)

    def update(self, all_pieces, platform_rects, player_rect):
        for piece in self.pieces:
            piece.check_player_step(player_rect)
            piece.update(all_pieces, platform_rects)

    def draw(self, surface):
        for piece in self.pieces:
            piece.draw(surface)


# ==============================================================================
# CLASE JUGADOR
# ==============================================================================
class Player:
    """Personaje jugable (Hombre o Mujer)."""
    WIDTH = 30
    HEIGHT = 38
    SPEED = 3.2
    MAX_SALT = 5
    START_LIVES = 3

    def __init__(self, gender="hombre"):
        self.gender = gender
        self.lives = self.START_LIVES
        self.salt_count = self.MAX_SALT
        self.projectiles = []
        
        self.facing = 1  # 1 = derecha, -1 = izquierda
        self.on_ladder = False
        self.stunned = False
        self.stun_timer = 0
        
        self.anim_tick = 0
        self.anim_frame = 0
        self.current_action = "idle"
        
        self._load_sprites()
        self.reset_position()

    def _load_sprites(self):
        size = (self.WIDTH, self.HEIGHT)
        g = "hombre" if self.gender == "hombre" else "mujer"
        
        # Animación Caminar
        walk_names = [
            f"jugador_{g}.png",
            f"{g}caminando.png",
            f"{g}caminando1.png",
            f"{g}caminando2.png",
            f"{g}caminando3.png",
        ]
        
        # Cargar frames de caminata
        self.walk_frames = []
        for i in range(4):
            f_name = f"{g}caminando{i if i > 0 else ''}.png"
            img = ResourceManager.load_image(
                [f_name, f"jugador_{g}.png"],
                size=size,
                fallback_color=COLOR_YELLOW if g == "hombre" else (255, 120, 180),
                shape="rect"
            )
            self.walk_frames.append(img)

        # Frente / Idle
        self.idle_frame = ResourceManager.load_image(
            [f"{g}frente.png", f"jugador_{g}.png"],
            size=size,
            fallback_color=COLOR_YELLOW if g == "hombre" else (255, 120, 180),
            shape="rect"
        )
        
        # Lanzando Sal
        self.throw_frame = ResourceManager.load_image(
            [f"{g}sal.png", f"jugador_{g}.png"],
            size=size,
            fallback_color=COLOR_WHITE,
            shape="rect"
        )

    def reset_position(self):
        """Posiciona al jugador en el punto de inicio."""
        self.x = float(1 * TILE_WIDTH + 5)
        self.y = float(2 * TILE_HEIGHT - self.HEIGHT)
        self.vy = 0.0
        self.on_ladder = False

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.WIDTH, self.HEIGHT)

    def throw_salt(self):
        """Lanza una carga de sal si tiene disponible."""
        if self.salt_count > 0:
            self.salt_count -= 1
            spawn_x = self.rect.right if self.facing == 1 else self.rect.left
            spawn_y = self.rect.centery
            salt = SaltEffect(spawn_x, spawn_y, self.facing)
            self.projectiles.append(salt)
            self.current_action = "throw"
            self.anim_frame = 0

    def handle_input(self, keys, level_map):
        col = int((self.x + self.WIDTH / 2) // TILE_WIDTH)
        row = int((self.y + self.HEIGHT / 2) // TILE_HEIGHT)
        
        # Detectar si está en una escalera
        at_ladder = level_map.is_ladder(col, row) or level_map.is_ladder(col, int((self.y + self.HEIGHT - 2) // TILE_HEIGHT))
        
        moving = False
        self.on_ladder = False

        # Movimiento Horizontal
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.SPEED
            self.facing = -1
            moving = True
            self.current_action = "walk"
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.SPEED
            self.facing = 1
            moving = True
            self.current_action = "walk"

        # Movimiento Vertical (solo si está en escalera)
        if at_ladder:
            if keys[pygame.K_UP] or keys[pygame.K_w]:
                self.y -= self.SPEED
                self.vy = 0.0
                self.on_ladder = True
                moving = True
                self.current_action = "walk"
            elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
                self.y += self.SPEED
                self.vy = 0.0
                self.on_ladder = True
                moving = True
                self.current_action = "walk"

        if not moving and self.current_action != "throw":
            self.current_action = "idle"

        # Aplicar Gravedad si no está en escalera
        if not self.on_ladder:
            self.vy = min(self.vy + 0.45, 9.0)
            self.y += self.vy
        else:
            self.vy = 0.0

        # Colisión con plataformas
        player_box = self.rect
        for plat in level_map.platform_rects:
            if player_box.colliderect(plat):
                # Solo aterriza si cae sobre la parte superior
                if self.vy > 0 and player_box.bottom - self.vy <= plat.top + 8:
                    self.y = float(plat.top - self.HEIGHT)
                    self.vy = 0.0

        # Restringir a los límites de pantalla
        self.x = max(0, min(self.x, SCREEN_WIDTH - self.WIDTH))
        if self.y < TILE_HEIGHT:
            self.y = float(TILE_HEIGHT)

    def update(self):
        # Actualizar proyectiles de sal
        for p in self.projectiles:
            p.update()
        self.projectiles = [p for p in self.projectiles if p.alive()]

        # Invulnerabilidad tras ser golpeado
        if self.stunned:
            self.stun_timer -= 1
            if self.stun_timer <= 0:
                self.stunned = False

        # Animación
        self.anim_tick += 1
        if self.anim_tick >= 7:
            self.anim_tick = 0
            self.anim_frame = (self.anim_frame + 1) % 4
            if self.current_action == "throw":
                self.current_action = "idle"

    def take_hit(self):
        """Resta una vida y activa invulnerabilidad temporal."""
        if not self.stunned:
            self.lives -= 1
            self.stunned = True
            self.stun_timer = FPS * 2  # 2 segundos de parpadeo
            return True
        return False

    def draw(self, surface):
        # Efecto parpadeo de invulnerabilidad
        if self.stunned and (pygame.time.get_ticks() // 100) % 2 == 0:
            return

        if self.current_action == "throw":
            img = self.throw_frame
        elif self.current_action == "walk":
            img = self.walk_frames[self.anim_frame]
        else:
            img = self.idle_frame

        # Invertir si mira a la izquierda
        if self.facing == -1:
            img = pygame.transform.flip(img, True, False)

        surface.blit(img, (int(self.x), int(self.y)))

        # Dibujar proyectiles
        for p in self.projectiles:
            p.draw(surface)


# ==============================================================================
# CLASE ENEMIGO: LA SALCHICHA
# ==============================================================================
class SausageEnemy:
    """Enemigo Salchicha con IA de persecución por plataformas y escaleras."""
    WIDTH = 30
    HEIGHT = 38
    SPEED = 1.8

    def __init__(self, start_col=17, start_row=2):
        self.start_col = start_col
        self.start_row = start_row
        self.facing = -1
        self.stunned = False
        self.stun_timer = 0
        self.anim_tick = 0
        self.anim_frame = 0
        self.on_ladder = False
        
        self._load_sprites()
        self.reset_position()

    def _load_sprites(self):
        size = (self.WIDTH, self.HEIGHT)
        self.walk_frames = []
        for i in range(4):
            f_name = f"salchichacaminando{i if i > 0 else ''}.png"
            img = ResourceManager.load_image(
                [f_name, "salchicha.png"],
                size=size,
                fallback_color=COLOR_RED,
                shape="rect"
            )
            self.walk_frames.append(img)

        self.stun_frame = ResourceManager.load_image(
            ["salchichafrente.png", "salchicha.png"],
            size=size,
            fallback_color=(180, 80, 80),
            shape="rect"
        )

    def reset_position(self):
        self.x = float(self.start_col * TILE_WIDTH)
        self.y = float(self.start_row * TILE_HEIGHT - self.HEIGHT)
        self.vy = 0.0
        self.stunned = False
        self.stun_timer = 0
        self.on_ladder = False

    def stun(self, duration=FPS * 4):
        """Aturde a la salchicha por X segundos."""
        self.stunned = True
        self.stun_timer = duration

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.WIDTH, self.HEIGHT)

    def update(self, player, level_map):
        if self.stunned:
            self.stun_timer -= 1
            if self.stun_timer <= 0:
                self.stunned = False
            return

        # ----------------------------------------------------------------------
        # IA DE PERSECUCIÓN
        # ----------------------------------------------------------------------
        col = int((self.x + self.WIDTH / 2) // TILE_WIDTH)
        row = int((self.y + self.HEIGHT / 2) // TILE_HEIGHT)

        target_x = player.x + player.WIDTH / 2
        target_y = player.y + player.HEIGHT / 2
        my_x = self.x + self.WIDTH / 2
        my_y = self.y + self.HEIGHT / 2

        at_ladder = level_map.is_ladder(col, row) or level_map.is_ladder(col, int((self.y + self.HEIGHT - 2) // TILE_HEIGHT))

        # Decisión Vertical (Subir/Bajar si está en escalera y el jugador está en otro nivel)
        dy = target_y - my_y
        dx = target_x - my_x

        if at_ladder and abs(dy) > 20:
            self.on_ladder = True
            if dy < 0:
                self.y -= self.SPEED * 0.9
            else:
                self.y += self.SPEED * 0.9
            self.vy = 0.0
        else:
            self.on_ladder = False
            # Movimiento horizontal hacia el jugador
            if dx < -5:
                self.x -= self.SPEED
                self.facing = -1
            elif dx > 5:
                self.x += self.SPEED
                self.facing = 1

        # Aplicar gravedad si no está escalando
        if not self.on_ladder:
            self.vy = min(self.vy + 0.45, 9.0)
            self.y += self.vy
        else:
            self.vy = 0.0

        # Colisiones con plataformas
        enemy_box = self.rect
        for plat in level_map.platform_rects:
            if enemy_box.colliderect(plat):
                if self.vy > 0 and enemy_box.bottom - self.vy <= plat.top + 8:
                    self.y = float(plat.top - self.HEIGHT)
                    self.vy = 0.0

        self.x = max(0, min(self.x, SCREEN_WIDTH - self.WIDTH))

        # Animación
        self.anim_tick += 1
        if self.anim_tick >= 8:
            self.anim_tick = 0
            self.anim_frame = (self.anim_frame + 1) % 4

    def draw(self, surface):
        if self.stunned:
            img = self.stun_frame
            # Parpadeo azulado de congelado / aturdimiento
            if (pygame.time.get_ticks() // 120) % 2 == 0:
                tint = img.copy()
                tint.fill((100, 200, 255, 120), special_flags=pygame.BLEND_RGBA_ADD)
                img = tint
        else:
            img = self.walk_frames[self.anim_frame]

        if self.facing == -1:
            img = pygame.transform.flip(img, True, False)

        surface.blit(img, (int(self.x), int(self.y)))


# ==============================================================================
# CLASE MAPA / NIVEL
# ==============================================================================
class LevelMap:
    """Administra el laberinto, plataformas, escaleras y renderizado del entorno."""
    def __init__(self):
        self.layout = LEVEL_LAYOUT
        self.platform_rects = []
        self._build_geometry()
        self._load_environment_sprites()

    def _build_geometry(self):
        self.platform_rects.clear()
        for r in range(ROWS):
            for c in range(COLS):
                char = self.layout[r][c]
                if char in ('P', 'B'):
                    # Plataforma sólida
                    rect = pygame.Rect(c * TILE_WIDTH, r * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT)
                    self.platform_rects.append(rect)

    def _load_environment_sprites(self):
        size = (TILE_WIDTH, TILE_HEIGHT)
        self.plat_sprite = ResourceManager.load_image(
            ["plataforma.png"],
            size=size,
            fallback_color=COLOR_PLATFORM,
            shape="rect"
        )
        self.ladder_sprite = ResourceManager.load_image(
            ["escalera.png"],
            size=size,
            fallback_color=COLOR_LADDER,
            shape="rect"
        )

    def is_ladder(self, col, row):
        if 0 <= row < ROWS and 0 <= col < COLS:
            return self.layout[row][col] in ('L', 'B')
        return False

    def draw(self, surface):
        # Fondo oscuro arcade
        surface.fill(COLOR_BG)

        for r in range(ROWS):
            for c in range(COLS):
                char = self.layout[r][c]
                x = c * TILE_WIDTH
                y = r * TILE_HEIGHT

                # Dibujar Escaleras primero (detrás de las plataformas)
                if char in ('L', 'B'):
                    surface.blit(self.ladder_sprite, (x, y))
                    # Rieles estilizados
                    pygame.draw.line(surface, COLOR_LADDER_RUNGS, (x + 8, y), (x + 8, y + TILE_HEIGHT), 2)
                    pygame.draw.line(surface, COLOR_LADDER_RUNGS, (x + TILE_WIDTH - 8, y), (x + TILE_WIDTH - 8, y + TILE_HEIGHT), 2)
                    for rung_y in range(y + 6, y + TILE_HEIGHT, 10):
                        pygame.draw.line(surface, COLOR_LADDER_RUNGS, (x + 8, rung_y), (x + TILE_WIDTH - 8, rung_y), 2)

                # Dibujar Plataformas
                if char in ('P', 'B'):
                    surface.blit(self.plat_sprite, (x, y))
                    # Borde superior retro
                    pygame.draw.line(surface, COLOR_PLATFORM_TOP, (x, y), (x + TILE_WIDTH, y), 3)

        # Dibujar Platos en la base para las 2 Hamburguesas (Cols 2 y 12)
        plate_y = 14 * TILE_HEIGHT + 14
        for p_col in [2, 12]:
            px = p_col * TILE_WIDTH
            pw = TILE_WIDTH * 4
            pygame.draw.ellipse(surface, (210, 210, 220), (px - 6, plate_y, pw + 12, 16))
            pygame.draw.ellipse(surface, (140, 140, 160), (px - 6, plate_y, pw + 12, 16), 2)


# ==============================================================================
# CLASE HUD (INTERFAZ DE USUARIO)
# ==============================================================================
class HUD:
    """Muestra vidas restantes, cargas de sal e información de estado."""
    def draw(self, surface, player):
        # Barra superior semi-transparente
        bar = pygame.Surface((SCREEN_WIDTH, 42), pygame.SRCALPHA)
        bar.fill((10, 10, 20, 220))
        surface.blit(bar, (0, 0))
        pygame.draw.line(surface, (80, 80, 110), (0, 42), (SCREEN_WIDTH, 42), 2)

        # Vidas
        lives_text = f"VIDAS: {player.lives}/{player.START_LIVES}"
        txt_v = FONT_HUD.render(lives_text, True, COLOR_RED if player.lives <= 1 else COLOR_WHITE)
        surface.blit(txt_v, (20, 10))
        # Corazones / Iconos
        for i in range(player.lives):
            pygame.draw.circle(surface, COLOR_RED, (160 + i * 18, 22), 6)

        # Sal
        salt_text = f"SAL: {player.salt_count}/{player.MAX_SALT}"
        txt_s = FONT_HUD.render(salt_text, True, COLOR_YELLOW if player.salt_count > 0 else COLOR_GRAY)
        surface.blit(txt_s, (320, 10))
        for i in range(player.salt_count):
            pygame.draw.rect(surface, COLOR_WHITE, (440 + i * 14, 16, 8, 12), border_radius=2)

        # Controles
        ctrl_txt = FONT_HUD.render("[FLECHAS]: Mover  [ESPACIO]: Sal", True, (170, 170, 200))
        surface.blit(ctrl_txt, (520, 10))


# ==============================================================================
# PANTALLA DE SELECCIÓN DE PERSONAJE
# ==============================================================================
class CharacterSelectScreen:
    """Menú interactivo para elegir Hombre o Mujer."""
    def __init__(self, screen, clock):
        self.screen = screen
        self.clock = clock
        
        # Cargar miniaturas de vista previa
        prev_size = (100, 130)
        self.img_hombre = ResourceManager.load_image(
            ["hombrefrente.png", "jugador_hombre.png"],
            size=prev_size,
            fallback_color=COLOR_YELLOW,
            shape="rect"
        )
        self.img_mujer = ResourceManager.load_image(
            ["mujerfrente.png", "jugador_mujer.png"],
            size=prev_size,
            fallback_color=(255, 120, 180),
            shape="rect"
        )

    def run(self):
        selected = "hombre"
        cx = SCREEN_WIDTH // 2
        cy = SCREEN_HEIGHT // 2

        btn_hombre = pygame.Rect(cx - 210, cy - 80, 180, 210)
        btn_mujer = pygame.Rect(cx + 30, cy - 80, 180, 210)

        while True:
            self.clock.tick(FPS)
            mx, my = pygame.mouse.get_pos()
            hover_h = btn_hombre.collidepoint(mx, my)
            hover_m = btn_mujer.collidepoint(mx, my)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_LEFT or event.key == pygame.K_1 or event.key == pygame.K_h:
                        selected = "hombre"
                    elif event.key == pygame.K_RIGHT or event.key == pygame.K_2 or event.key == pygame.K_m:
                        selected = "mujer"
                    elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        return selected
                    elif event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if hover_h:
                        return "hombre"
                    if hover_m:
                        return "mujer"

            # Render
            self.screen.fill(COLOR_BG)

            # Título y Efecto Glow
            t = pygame.time.get_ticks() / 1000.0
            pulse_color = (
                int(220 + 35 * math.sin(t * 3)),
                int(160 + 50 * math.sin(t * 3)),
                40
            )
            title = FONT_TITLE.render("BURGER TIME RETRO", True, pulse_color)
            self.screen.blit(title, title.get_rect(center=(cx, 90)))

            subtitle = FONT_SUBTITLE.render("SELECCIONA TU PERSONAJE", True, COLOR_WHITE)
            self.screen.blit(subtitle, subtitle.get_rect(center=(cx, 145)))

            # Opción 1: Hombre
            is_active_h = (selected == "hombre") or hover_h
            card_bg_h = (50, 50, 80) if is_active_h else (25, 25, 40)
            border_h = COLOR_YELLOW if is_active_h else COLOR_DARK_GRAY
            pygame.draw.rect(self.screen, card_bg_h, btn_hombre, border_radius=12)
            pygame.draw.rect(self.screen, border_h, btn_hombre, 4 if is_active_h else 2, border_radius=12)
            self.screen.blit(self.img_hombre, (btn_hombre.centerx - 50, btn_hombre.y + 20))
            lbl_h = FONT_SUBTITLE.render("HOMBRE [1]", True, COLOR_YELLOW if is_active_h else COLOR_GRAY)
            self.screen.blit(lbl_h, lbl_h.get_rect(center=(btn_hombre.centerx, btn_hombre.bottom - 28)))

            # Opción 2: Mujer
            is_active_m = (selected == "mujer") or hover_m
            card_bg_m = (50, 50, 80) if is_active_m else (25, 25, 40)
            border_m = COLOR_YELLOW if is_active_m else COLOR_DARK_GRAY
            pygame.draw.rect(self.screen, card_bg_m, btn_mujer, border_radius=12)
            pygame.draw.rect(self.screen, border_m, btn_mujer, 4 if is_active_m else 2, border_radius=12)
            self.screen.blit(self.img_mujer, (btn_mujer.centerx - 50, btn_mujer.y + 20))
            lbl_m = FONT_SUBTITLE.render("MUJER [2]", True, COLOR_YELLOW if is_active_m else COLOR_GRAY)
            self.screen.blit(lbl_m, lbl_m.get_rect(center=(btn_mujer.centerx, btn_mujer.bottom - 28)))

            # Instrucción
            inst = FONT_HUD.render("Presiona [ENTER] o Haz Clic para Jugar", True, (160, 200, 255))
            self.screen.blit(inst, inst.get_rect(center=(cx, SCREEN_HEIGHT - 60)))

            pygame.display.flip()


# ==============================================================================
# PANTALLA DE RESULTADO (VICTORIA O DERROTA)
# ==============================================================================
class ResultScreen:
    """Pantalla final de ¡GANASTE! o GAME OVER con opción de revancha."""
    def run(self, screen, clock, won):
        while True:
            clock.tick(FPS)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_RETURN, pygame.K_SPACE, pygame.K_r):
                        return "restart"
                    elif event.key == pygame.K_ESCAPE:
                        return "quit"

            # Overlay oscuro
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            overlay.fill((10, 10, 18, 230))
            screen.blit(overlay, (0, 0))

            cx = SCREEN_WIDTH // 2
            cy = SCREEN_HEIGHT // 2

            if won:
                msg = FONT_MSG.render("¡¡ GANASTE !!", True, COLOR_GREEN)
                sub = FONT_SUBTITLE.render("¡Has completado las 2 hamburguesas con éxito!", True, COLOR_WHITE)
            else:
                msg = FONT_MSG.render("GAME OVER", True, COLOR_RED)
                sub = FONT_SUBTITLE.render("¡La salchicha te ha alcanzado!", True, COLOR_WHITE)

            screen.blit(msg, msg.get_rect(center=(cx, cy - 60)))
            screen.blit(sub, sub.get_rect(center=(cx, cy + 10)))

            prompt = FONT_HUD.render("Presiona [R] o [ENTER] para Reiniciar - [ESC] Salir", True, COLOR_YELLOW)
            screen.blit(prompt, prompt.get_rect(center=(cx, cy + 90)))

            pygame.display.flip()


# ==============================================================================
# CONTROLADOR PRINCIPAL DEL JUEGO
# ==============================================================================
class Game:
    """Loop principal y orquestador de componentes."""
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("BurgerTime Arcade 2D")
        self.clock = pygame.time.Clock()
        self.hud = HUD()
        self.result_screen = ResultScreen()

    def run(self):
        while True:
            # 1. Menú de Selección de Personaje
            char_select = CharacterSelectScreen(self.screen, self.clock)
            gender = char_select.run()

            # 2. Inicialización de Nivel y Entidades
            level_map = LevelMap()
            player = Player(gender=gender)
            sausage = SausageEnemy(start_col=17, start_row=2)

            # Crear exactamente 2 hamburguesas (Columnas 2 y 12)
            burgers = [
                Burger(col_x=2, burger_id=1),
                Burger(col_x=12, burger_id=2)
            ]

            game_state = "PLAYING"  # PLAYING | WON | LOST

            # 3. Game Loop
            while game_state == "PLAYING":
                self.clock.tick(FPS)

                # --- Manejo de Eventos ---
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        pygame.quit()
                        sys.exit()
                    if event.type == pygame.KEYDOWN:
                        if event.key == pygame.K_ESCAPE:
                            pygame.quit()
                            sys.exit()
                        if event.key == pygame.K_SPACE:
                            player.throw_salt()

                # --- Input y Actualización del Jugador ---
                keys = pygame.key.get_pressed()
                player.handle_input(keys, level_map)
                player.update()

                # --- Actualización del Enemigo ---
                sausage.update(player, level_map)

                # --- Lista de todas las piezas de hamburguesas ---
                all_pieces = []
                for b in burgers:
                    all_pieces.extend(b.pieces)

                # --- Actualizar Hamburguesas ---
                for b in burgers:
                    b.update(all_pieces, level_map.platform_rects, player.rect)

                # --- Colisión Sal -> Enemigo ---
                for salt in player.projectiles:
                    if salt.rect.colliderect(sausage.rect):
                        sausage.stun(duration=FPS * 4)  # Aturdido por 4 segundos
                        salt.kill()

                # --- Colisión Pieza de Hamburguesa Cayendo -> Aplasta al Enemigo ---
                for piece in all_pieces:
                    if piece.falling and piece.rect.colliderect(sausage.rect):
                        sausage.stun(duration=FPS * 5)

                # --- Colisión Enemigo -> Jugador ---
                if not sausage.stunned and not player.stunned:
                    if player.rect.colliderect(sausage.rect):
                        player.take_hit()
                        # Reiniciar posiciones de nivel tras perder vida
                        player.reset_position()
                        sausage.reset_position()

                # --- Comprobar Condiciones de Fin de Partida ---
                if player.lives <= 0:
                    game_state = "LOST"

                # Victoria: Las 2 hamburguesas completas
                if all(b.is_complete() for b in burgers):
                    game_state = "WON"

                # --- Renderizado ---
                level_map.draw(self.screen)

                # Dibujar Hamburguesas
                for b in burgers:
                    b.draw(self.screen)

                # Dibujar Enemigo y Jugador
                sausage.draw(self.screen)
                player.draw(self.screen)

                # Dibujar Interfaz (HUD)
                self.hud.draw(self.screen, player)

                pygame.display.flip()

            # 4. Pantalla de Fin de Partida
            action = self.result_screen.run(self.screen, self.clock, won=(game_state == "WON"))
            if action == "quit":
                pygame.quit()
                sys.exit()


# ==============================================================================
# PUNTO DE ENTRADA
# ==============================================================================
if __name__ == "__main__":
    game = Game()
    game.run()
