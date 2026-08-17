"""
BurgerTime Arcade 2D Game (Python / Pygame)
Estructura de mapa fiel al BurgerTime clásico de Arcade adaptada para 2 hamburguesas completas de 7 capas.
"""

import pygame
import sys
import os
import math

# ==============================================================================
# CONFIGURACIÓN Y CONSTANTES GLOBALES
# ==============================================================================
SCREEN_W = 800
SCREEN_H = 720
FPS = 60

# Paleta Retro Arcade Auténtica
C_BG = (0, 0, 0)
C_PLATFORM_CYAN = (0, 240, 255)
C_PLATFORM_DARK = (0, 59, 82)
C_LADDER_RAIL = (0, 208, 240)
C_LADDER_RUNG = (216, 216, 216)
C_TEXT_RED = (255, 34, 34)
C_TEXT_WHITE = (255, 255, 255)
C_TEXT_GREEN = (34, 255, 68)
C_TEXT_YELLOW = (255, 255, 0)
C_TEXT_GRAY = (136, 136, 136)

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

pygame.init()
pygame.font.init()

FONT_TITLE = pygame.font.SysFont("Impact, Arial Black, sans-serif", 40)
FONT_SUBTITLE = pygame.font.SysFont("Arial, sans-serif", 19, bold=True)
FONT_HUD = pygame.font.SysFont("Consolas, Courier, monospace", 16, bold=True)
FONT_MSG = pygame.font.SysFont("Impact, Arial Black, sans-serif", 52)


# ==============================================================================
# GESTOR DE RECURSOS Y SPRITES
# ==============================================================================
class ResourceManager:
    _cache = {}

    @classmethod
    def load_image(cls, names, size=None, fallback_color=C_TEXT_YELLOW):
        if isinstance(names, str):
            names = [names]

        cache_key = (tuple(names), size)
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        image = None
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
                        break
                    except Exception as e:
                        print(f"[ERROR] No se pudo cargar '{full_path}': {e}")
            if image is not None:
                break

        if image is not None:
            if size is not None:
                image = pygame.transform.smoothscale(image, size)
            cls._cache[cache_key] = image
            return image

        w, h = size if size is not None else (40, 40)
        surf = pygame.Surface((w, h), pygame.SRCALPHA)
        pygame.draw.rect(surf, fallback_color, (0, 0, w, h), border_radius=4)
        cls._cache[cache_key] = surf
        return surf


# ==============================================================================
# ESTRUCTURA DE NIVELES (ESTRUCTURA BURGERTIME ARCADE)
# ==============================================================================
FLOOR_Y_COORDS = [105, 180, 255, 330, 405, 480, 555, 630]

PLATFORMS_DATA = [
    # Piso 0
    (0, 30, 770),
    # Piso 1
    (1, 30, 320), (1, 350, 450), (1, 480, 770),
    # Piso 2
    (2, 30, 240), (2, 270, 530), (2, 560, 770),
    # Piso 3
    (3, 30, 320), (3, 350, 450), (3, 480, 770),
    # Piso 4
    (4, 30, 240), (4, 270, 530), (4, 560, 770),
    # Piso 5
    (5, 30, 320), (5, 350, 450), (5, 480, 770),
    # Piso 6
    (6, 30, 770),
    # Piso 7 (Base)
    (7, 30, 770),
]

LADDERS_DATA = [
    # Piso 0 a 1
    (50,  105, 180, 26), (300, 105, 180, 26), (390, 105, 180, 26), (490, 105, 180, 26), (730, 105, 180, 26),
    # Piso 1 a 2
    (100, 180, 255, 26), (210, 180, 255, 26), (390, 180, 255, 26), (590, 180, 255, 26), (690, 180, 255, 26),
    # Piso 2 a 3
    (50,  255, 330, 26), (300, 255, 330, 26), (390, 255, 330, 26), (490, 255, 330, 26), (730, 255, 330, 26),
    # Piso 3 a 4
    (100, 330, 405, 26), (210, 330, 405, 26), (390, 330, 405, 26), (590, 330, 405, 26), (690, 330, 405, 26),
    # Piso 4 a 5
    (50,  405, 480, 26), (300, 405, 480, 26), (390, 405, 480, 26), (490, 405, 480, 26), (730, 405, 480, 26),
    # Piso 5 a 6
    (100, 480, 555, 26), (210, 480, 555, 26), (390, 480, 555, 26), (590, 480, 555, 26), (690, 480, 555, 26),
    # Piso 6 a 7
    (50,  555, 630, 26), (300, 555, 630, 26), (390, 555, 630, 26), (490, 555, 630, 26), (730, 555, 630, 26),
]


class Ladder:
    def __init__(self, x, top_y, bottom_y, w=26):
        self.x = x
        self.top_y = top_y
        self.bottom_y = bottom_y
        self.w = w

    def contains_point(self, cx, cy, range_x=20):
        if abs(cx - (self.x + self.w / 2)) <= range_x:
            return self.top_y - 8 <= cy <= self.bottom_y + 8
        return False

    def is_below(self, cx, feet_y, range_x=20):
        if abs(cx - (self.x + self.w / 2)) <= range_x:
            return abs(feet_y - self.top_y) <= 10
        return False


class LevelStructure:
    def __init__(self):
        self.floors_y = FLOOR_Y_COORDS
        self.platforms = PLATFORMS_DATA
        self.ladders = [Ladder(x, top, btm, w) for (x, top, btm, w) in LADDERS_DATA]
        self.burger1_x = 140
        self.burger2_x = 520
        self.burger_width = 140

    def find_ladder_at(self, cx, cy, range_x=20):
        for lad in self.ladders:
            if lad.contains_point(cx, cy, range_x):
                return lad
        return None

    def find_ladder_below(self, cx, feet_y, range_x=20):
        for lad in self.ladders:
            if lad.is_below(cx, feet_y, range_x):
                return lad
        return None

    def is_point_on_platform(self, x, y):
        for (f_idx, x1, x2) in self.platforms:
            fy = self.floors_y[f_idx]
            if abs(y - fy) <= 12 and x1 <= x <= x2:
                return fy
        return None

    def draw(self, surface):
        surface.fill(C_BG)

        # 1. Escaleras (Peldaños grises densos con rieles cyan)
        for lad in self.ladders:
            lx, top, btm, lw = lad.x, lad.top_y, lad.bottom_y, lad.w
            pygame.draw.rect(surface, C_LADDER_RAIL, (lx, top, 3, btm - top))
            pygame.draw.rect(surface, C_LADDER_RAIL, (lx + lw - 3, top, 3, btm - top))
            for ry in range(top + 4, btm, 6):
                pygame.draw.rect(surface, C_LADDER_RUNG, (lx + 2, ry, lw - 4, 2))

        # 2. Vigas / Plataformas Cyan Brillante
        for (f_idx, x1, x2) in self.platforms:
            fy = self.floors_y[f_idx]
            pw = x2 - x1
            pygame.draw.rect(surface, C_PLATFORM_DARK, (x1, fy, pw, 6))
            pygame.draw.rect(surface, C_PLATFORM_CYAN, (x1, fy, pw, 2))
            pygame.draw.rect(surface, C_PLATFORM_CYAN, (x1, fy + 4, pw, 2))
            for rx in range(x1 + 8, x2, 16):
                pygame.draw.rect(surface, C_PLATFORM_CYAN, (rx, fy + 2, 2, 2))

        # 3. Platos de Servido (Y=630)
        plate_y = 630 + 4
        for bx in [self.burger1_x, self.burger2_x]:
            pw = self.burger_width
            px = bx - 10
            pygame.draw.ellipse(surface, (255, 255, 255), (px - 6, plate_y, pw + 12, 12))
            pygame.draw.ellipse(surface, C_PLATFORM_CYAN, (px - 6, plate_y, pw + 12, 12), 2)


# ==============================================================================
# PROYECTIL DE SAL
# ==============================================================================
class SaltCloud(pygame.sprite.Sprite):
    def __init__(self, x, y, direction):
        super().__init__()
        self.direction = direction
        self.speed = 8.0
        self.w, self.h = 26, 26
        self.rect = pygame.Rect(x, y, self.w, self.h)
        self.lifetime = 22
        self.image = ResourceManager.load_image(["sal.png", "hombresal.png"], size=(self.w, self.h), fallback_color=C_TEXT_WHITE)

    def update(self):
        self.rect.x += self.speed * self.direction
        self.lifetime -= 1
        if self.lifetime <= 0 or self.rect.right < 0 or self.rect.left > SCREEN_W:
            self.kill()

    def draw(self, surface):
        surface.blit(self.image, self.rect)


# ==============================================================================
# PIEZAS DE HAMBURGUESA (7 CAPAS)
# ==============================================================================
LAYER_INFO = {
  "pan_superior": {"sprite": ["arribapan.png", "pan_superior.png"], "h": 36, "overlap": 10, "pts": 100},
  "cebolla":      {"sprite": ["cebolla.png"],                       "h": 26, "overlap": 12, "pts": 80 },
  "bacon":        {"sprite": ["bacon.png"],                         "h": 26, "overlap": 10, "pts": 80 },
  "queso":        {"sprite": ["queso.png"],                         "h": 22, "overlap": 8,  "pts": 60 },
  "paty":         {"sprite": ["paty.png", "carne.png"],             "h": 28, "overlap": 8,  "pts": 100},
  "mayonesa":     {"sprite": ["mayonesa.png"],                      "h": 22, "overlap": 10, "pts": 60 },
  "pan_inferior": {"sprite": ["abajopan.png", "pan_inferior.png"], "h": 32, "overlap": 0,  "pts": 100},
}

ORDERED_KEYS = [
    "pan_superior",
    "cebolla",
    "bacon",
    "queso",
    "paty",
    "mayonesa",
    "pan_inferior",
]


class IngredientPiece:
    def __init__(self, layer_key, floor_idx, start_x, level_struct):
        self.layer_key = layer_key
        self.info = LAYER_INFO[layer_key]
        self.floor_idx = floor_idx
        self.start_x = start_x
        self.level = level_struct

        self.w = level_struct.burger_width
        self.h = self.info["h"]
        self.x = float(start_x)
        self.y = float(self.level.floors_y[floor_idx] - self.h)

        self.falling = False
        self.fall_speed = 0.0
        self.target_floor_idx = floor_idx
        self.landed_on_plate = (floor_idx == 7)

        self.num_segments = 4
        self.stepped = [False] * 4
        self.step_offsets = [0.0] * 4

        self.image = ResourceManager.load_image(self.info["sprite"], size=(self.w, self.h), fallback_color=C_TEXT_YELLOW)

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def check_player_step(self, player_rect, add_score_cb):
        if self.falling or self.landed_on_plate:
            return

        p_feet = player_rect.bottom
        p_center = player_rect.centerx
        floor_y = self.level.floors_y[self.floor_idx]

        if abs(p_feet - floor_y) <= 12 and player_rect.right > self.rect.left and player_rect.left < self.rect.right:
            seg_w = self.w / self.num_segments
            seg_idx = int((p_center - self.x) // seg_w)
            if 0 <= seg_idx < self.num_segments:
                if not self.stepped[seg_idx]:
                    self.stepped[seg_idx] = True
                    self.step_offsets[seg_idx] = 3.5
                    if add_score_cb: add_score_cb(10)

            stepped_count = sum(1 for s in self.stepped if s)
            if stepped_count >= 2 or all(self.stepped):
                self.trigger_fall(add_score_cb)

    def trigger_fall(self, add_score_cb):
        if self.falling or self.landed_on_plate:
            return

        if self.floor_idx < len(self.level.floors_y) - 1:
            self.falling = True
            self.fall_speed = 3.8
            self.target_floor_idx = self.floor_idx + 1
            self.stepped = [False] * 4
            self.step_offsets = [0.0] * 4
            if add_score_cb: add_score_cb(50)

    def update(self, all_pieces, sausage, add_score_cb):
        if self.falling:
            self.fall_speed = min(self.fall_speed + 0.45, 9.5)
            self.y += self.fall_speed

            if sausage and not sausage.stunned:
                if self.rect.colliderect(sausage.rect):
                    sausage.stun(FPS * 5)
                    if add_score_cb: add_score_cb(500)

            # Caída en cadena
            for other in all_pieces:
                if other is self or other.start_x != self.start_x:
                    continue
                if other.floor_idx == self.target_floor_idx and not other.falling and not other.landed_on_plate:
                    if self.y + self.h >= other.y:
                        other.trigger_fall(add_score_cb)

            target_y = self.level.floors_y[self.target_floor_idx] - self.h
            if self.y >= target_y:
                self.y = float(target_y)
                self.floor_idx = self.target_floor_idx
                self.falling = False
                self.fall_speed = 0.0
                self.stepped = [False] * 4
                self.step_offsets = [0.0] * 4

                if self.floor_idx == len(self.level.floors_y) - 1:
                    self.landed_on_plate = True
                    if add_score_cb: add_score_cb(self.info["pts"])

    def draw(self, surface):
        surface.blit(self.image, (int(self.x), int(self.y)))
        seg_w = self.w / self.num_segments
        for i, offset in enumerate(self.step_offsets):
            if offset > 0:
                pygame.draw.rect(
                    surface,
                    (0, 0, 0),
                    (int(self.x + i * seg_w), int(self.y + self.h - 4), int(seg_w), 4)
                )


class BurgerStack:
    def __init__(self, start_x, level_struct):
        self.start_x = start_x
        self.level = level_struct
        self.pieces = []
        for i, key in enumerate(ORDERED_KEYS):
            self.pieces.append(IngredientPiece(key, i, start_x, level_struct))

    def is_complete(self):
        return all(p.landed_on_plate for p in self.pieces)

    def update(self, all_pieces, sausage, player_rect, add_score_cb):
        for p in self.pieces:
            p.check_player_step(player_rect, add_score_cb)
            p.update(all_pieces, sausage, add_score_cb)

        # Apilado perfecto en la base
        if self.pieces[6].landed_on_plate:
            base_y = float(self.level.floors_y[7] - self.pieces[6].h)
            self.pieces[6].y = base_y
            curr_top = base_y

            for i in range(5, -1, -1):
                piece = self.pieces[i]
                if piece.landed_on_plate:
                    curr_top = curr_top - piece.h + piece.info["overlap"]
                    piece.y = curr_top

    def draw(self, surface):
        for i in range(len(self.pieces) - 1, -1, -1):
            self.pieces[i].draw(surface)


# ==============================================================================
# JUGADOR
# ==============================================================================
class Player:
    def __init__(self, gender, level_struct):
        self.gender = gender
        self.level = level_struct
        self.w = 30
        self.h = 40
        self.speed = 3.3
        self.climb_speed = 2.8

        self.lives = 3
        self.salt_count = 5
        self.max_salt = 5
        self.projectiles = []

        self.facing = 1
        self.is_climbing = False
        self.current_ladder = None

        self.stunned = False
        self.stun_timer = 0
        self.anim_tick = 0
        self.anim_frame = 0
        self.current_action = "idle"

        self._load_sprites()
        self.reset_position()

    def _load_sprites(self):
        g = self.gender
        size = (self.w, self.h)
        self.walk_frames = [
            ResourceManager.load_image([f"{g}caminando{i if i > 0 else ''}.png", f"jugador_{g}.png"], size=size),
            ResourceManager.load_image([f"{g}caminando1.png", f"jugador_{g}.png"], size=size),
            ResourceManager.load_image([f"{g}caminando2.png", f"jugador_{g}.png"], size=size),
            ResourceManager.load_image([f"{g}caminando3.png", f"jugador_{g}.png"], size=size),
        ]
        self.idle_frame = ResourceManager.load_image([f"{g}frente.png", f"jugador_{g}.png"], size=size)
        self.salt_frame = ResourceManager.load_image([f"{g}sal.png", f"jugador_{g}.png"], size=size)

    def reset_position(self):
        self.x = 40.0
        self.y = float(self.level.floors_y[0] - self.h)
        self.vy = 0.0
        self.is_climbing = False
        self.current_ladder = None

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def throw_salt(self):
        if self.salt_count > 0:
            self.salt_count -= 1
            sx = self.rect.right if self.facing == 1 else self.rect.left - 24
            sy = self.rect.centery - 10
            self.projectiles.append(SaltCloud(sx, sy, self.facing))
            self.current_action = "salt"
            self.anim_frame = 0

    def handle_input(self, keys):
        cx = self.x + self.w / 2
        feet_y = self.y + self.h
        center_y = self.y + self.h / 2
        moved = False

        if self.is_climbing and self.current_ladder:
            lad = self.current_ladder
            self.x = lad.x + lad.w / 2 - self.w / 2

            if keys[pygame.K_UP] or keys[pygame.K_w]:
                self.y -= self.climb_speed
                moved = True
                self.current_action = "walk"
                if feet_y <= lad.top_y + 4:
                    self.y = float(lad.top_y - self.h)
                    self.is_climbing = False
                    self.current_ladder = None
            elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
                self.y += self.climb_speed
                moved = True
                self.current_action = "walk"
                if feet_y >= lad.bottom_y:
                    self.y = float(lad.bottom_y - self.h)
                    self.is_climbing = False
                    self.current_ladder = None

            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                self.x -= self.speed
                self.facing = -1
                self.is_climbing = False
                self.current_ladder = None
                moved = True
            elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                self.x += self.speed
                self.facing = 1
                self.is_climbing = False
                self.current_ladder = None
                moved = True

            self.vy = 0.0
        else:
            if keys[pygame.K_DOWN] or keys[pygame.K_s]:
                lad_below = self.level.find_ladder_below(cx, feet_y, 20)
                if lad_below:
                    self.is_climbing = True
                    self.current_ladder = lad_below
                    self.x = lad_below.x + lad_below.w / 2 - self.w / 2
                    self.y += 6
                    moved = True
                    self.current_action = "walk"

            if (keys[pygame.K_UP] or keys[pygame.K_w]) and not self.is_climbing:
                lad_near = self.level.find_ladder_at(cx, center_y, 20)
                if lad_near:
                    self.is_climbing = True
                    self.current_ladder = lad_near
                    self.x = lad_near.x + lad_near.w / 2 - self.w / 2
                    self.y -= 4
                    moved = True
                    self.current_action = "walk"

            if not self.is_climbing:
                if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                    self.x -= self.speed
                    self.facing = -1
                    moved = True
                    self.current_action = "walk"
                elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                    self.x += self.speed
                    self.facing = 1
                    moved = True
                    self.current_action = "walk"

                self.vy = min(self.vy + 0.45, 9.0)
                self.y += self.vy

                plat_y = self.level.is_point_on_platform(cx, self.y + self.h)
                if plat_y is not None and self.vy > 0 and self.y + self.h - self.vy <= plat_y + 10:
                    self.y = float(plat_y - self.h)
                    self.vy = 0.0

        if not moved and self.current_action != "salt":
            self.current_action = "idle"

        self.x = max(30.0, min(self.x, float(SCREEN_W - 30 - self.w)))
        if self.y < 50:
            self.y = 50.0

    def take_hit(self):
        if not self.stunned:
            self.lives -= 1
            self.stunned = True
            self.stun_timer = FPS * 2
            return True
        return False

    def update(self):
        for p in self.projectiles:
            p.update()
        self.projectiles = [p for p in self.projectiles if p.alive()]

        if self.stunned:
            self.stun_timer -= 1
            if self.stun_timer <= 0:
                self.stunned = False

        self.anim_tick += 1
        if self.anim_tick >= 7:
            self.anim_tick = 0
            self.anim_frame = (self.anim_frame + 1) % 4
            if self.current_action == "salt":
                self.current_action = "idle"

    def draw(self, surface):
        if self.stunned and (pygame.time.get_ticks() // 100) % 2 == 0:
            return

        if self.current_action == "salt":
            img = self.salt_frame
        elif self.current_action == "walk":
            img = self.walk_frames[self.anim_frame]
        else:
            img = self.idle_frame

        if self.facing == -1:
            img = pygame.transform.flip(img, True, False)

        surface.blit(img, (int(self.x), int(self.y)))
        for p in self.projectiles:
            p.draw(surface)


# ==============================================================================
# ENEMIGO: SALCHICHA
# ==============================================================================
class SausageEnemy:
    def __init__(self, level_struct):
        self.level = level_struct
        self.w = 30
        self.h = 40
        self.speed = 1.8
        self.climb_speed = 1.6

        self.facing = -1
        self.stunned = False
        self.stun_timer = 0
        self.is_climbing = False
        self.current_ladder = None
        self.anim_tick = 0
        self.anim_frame = 0

        self._load_sprites()
        self.reset_position()

    def _load_sprites(self):
        size = (self.w, self.h)
        self.walk_frames = [
            ResourceManager.load_image([f"salchichacaminando{i if i > 0 else ''}.png", "salchicha.png"], size=size),
            ResourceManager.load_image(["salchichacaminando1.png", "salchicha.png"], size=size),
            ResourceManager.load_image(["salchichacaminando2.png", "salchicha.png"], size=size),
            ResourceManager.load_image(["salchichacaminando3.png", "salchicha.png"], size=size),
        ]
        self.stun_frame = ResourceManager.load_image(["salchichafrente.png", "salchicha.png"], size=size)

    def reset_position(self):
        self.x = 710.0
        self.y = float(self.level.floors_y[0] - self.h)
        self.vy = 0.0
        self.stunned = False
        self.stun_timer = 0
        self.is_climbing = False
        self.current_ladder = None

    def stun(self, dur=FPS * 4):
        self.stunned = True
        self.stun_timer = dur
        self.is_climbing = False

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def update(self, player):
        if self.stunned:
            self.stun_timer -= 1
            if self.stun_timer <= 0:
                self.stunned = False
            return

        my_cx = self.x + self.w / 2
        my_cy = self.y + self.h / 2
        p_cx = player.x + player.w / 2
        p_cy = player.y + player.h / 2

        dy = p_cy - my_cy
        dx = p_cx - my_cx

        if self.is_climbing and self.current_ladder:
            lad = self.current_ladder
            self.x = lad.x + lad.w / 2 - self.w / 2
            if dy < -8:
                self.y -= self.climb_speed
                if self.y + self.h <= lad.top_y + 4:
                    self.y = float(lad.top_y - self.h)
                    self.is_climbing = False
            elif dy > 8:
                self.y += self.climb_speed
                if self.y + self.h >= lad.bottom_y:
                    self.y = float(lad.bottom_y - self.h)
                    self.is_climbing = False
            else:
                self.is_climbing = False
        else:
            if abs(dy) > 20:
                lad = self.level.find_ladder_at(my_cx, my_cy, 35)
                if lad:
                    if (dy < 0 and my_cy > lad.top_y) or (dy > 0 and my_cy < lad.bottom_y):
                        self.is_climbing = True
                        self.current_ladder = lad

            if not self.is_climbing:
                if dx < -4:
                    self.x -= self.speed
                    self.facing = -1
                elif dx > 4:
                    self.x += self.speed
                    self.facing = 1

                self.vy = min(self.vy + 0.45, 9.0)
                self.y += self.vy

                plat_y = self.level.is_point_on_platform(my_cx, self.y + self.h)
                if plat_y is not None and self.vy > 0 and self.y + self.h - self.vy <= plat_y + 10:
                    self.y = float(plat_y - self.h)
                    self.vy = 0.0

        self.x = max(30.0, min(self.x, float(SCREEN_W - 30 - self.w)))

        self.anim_tick += 1
        if self.anim_tick >= 8:
            self.anim_tick = 0
            self.anim_frame = (self.anim_frame + 1) % 4

    def draw(self, surface):
        img = self.stun_frame if self.stunned else self.walk_frames[self.anim_frame]
        if self.facing == -1:
            img = pygame.transform.flip(img, True, False)

        if self.stunned:
            tint = img.copy()
            tint.fill((0, 240, 255, 120), special_flags=pygame.BLEND_RGBA_ADD)
            surface.blit(tint, (int(self.x), int(self.y)))
        else:
            surface.blit(img, (int(self.x), int(self.y)))


# ==============================================================================
# HUD
# ==============================================================================
class HUD:
    def draw(self, surface, player, burgers, score, hi_score):
        # 1UP & SCORE
        txt_1up = FONT_HUD.render("1UP", True, C_TEXT_RED)
        txt_score = FONT_HUD.render(str(score).rjust(6), True, C_TEXT_WHITE)
        surface.blit(txt_1up, (50, 15))
        surface.blit(txt_score, (50, 35))

        # HI-SCORE
        txt_hi = FONT_HUD.render("HI-SCORE", True, C_TEXT_RED)
        txt_hiscore = FONT_HUD.render(str(hi_score).rjust(6), True, C_TEXT_WHITE)
        surface.blit(txt_hi, (320, 15))
        surface.blit(txt_hiscore, (335, 35))

        # PEPPER / SAL
        txt_pep = FONT_HUD.render("PEPPER", True, C_TEXT_GREEN)
        txt_pepval = FONT_HUD.render(str(player.salt_count).rjust(5), True, C_TEXT_WHITE)
        surface.blit(txt_pep, (620, 15))
        surface.blit(txt_pepval, (640, 35))

        # Barra inferior
        bot_y = SCREEN_H - 30
        txt_lives = FONT_HUD.render("LIVES:", True, C_TEXT_YELLOW)
        surface.blit(txt_lives, (40, bot_y))
        for i in range(player.lives):
            pygame.draw.circle(surface, C_TEXT_RED, (110 + i * 16, bot_y + 8), 5)

        completed = sum(1 for b in burgers if b.is_complete())
        txt_b = FONT_HUD.render(f"BURGERS: {completed}/2", True, C_TEXT_GREEN)
        surface.blit(txt_b, (600, bot_y))


# ==============================================================================
# PANTALLAS DE MENÚ Y FIN DE PARTIDA
# ==============================================================================
class CharacterSelectScreen:
    def __init__(self, screen, clock):
        self.screen = screen
        self.clock = clock
        self.img_h = ResourceManager.load_image(["hombrefrente.png", "jugador_hombre.png"], size=(90, 120))
        self.img_m = ResourceManager.load_image(["mujerfrente.png", "jugador_mujer.png"], size=(90, 120))

    def run(self):
        selected = "hombre"
        cx = SCREEN_W // 2
        cy = SCREEN_H // 2
        btn_h = pygame.Rect(cx - 210, cy - 70, 180, 210)
        btn_m = pygame.Rect(cx + 30, cy - 70, 180, 210)

        while True:
            self.clock.tick(FPS)
            mx, my = pygame.mouse.get_pos()
            hover_h = btn_h.collidepoint(mx, my)
            hover_m = btn_m.collidepoint(mx, my)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_1, pygame.K_h, pygame.K_LEFT):
                        selected = "hombre"
                    elif event.key in (pygame.K_2, pygame.K_m, pygame.K_RIGHT):
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

            self.screen.fill(C_BG)

            t = pygame.time.get_ticks() / 1000.0
            pulse_color = (
                int(220 + 35 * math.sin(t * 3)),
                int(160 + 50 * math.sin(t * 3)),
                40
            )
            title = FONT_TITLE.render("BURGERTIME ARCADE", True, pulse_color)
            self.screen.blit(title, title.get_rect(center=(cx, 90)))

            sub = FONT_SUBTITLE.render("SELECCIONA TU CHEF", True, C_TEXT_WHITE)
            self.screen.blit(sub, sub.get_rect(center=(cx, 140)))

            is_active_h = (selected == "hombre") or hover_h
            pygame.draw.rect(self.screen, C_PLATFORM_DARK if is_active_h else (17, 17, 30), btn_h, border_radius=12)
            pygame.draw.rect(self.screen, C_PLATFORM_CYAN if is_active_h else (0, 85, 119), btn_h, 3 if is_active_h else 2, border_radius=12)
            self.screen.blit(self.img_h, (btn_h.centerx - 45, btn_h.y + 20))
            lbl_h = FONT_SUBTITLE.render("HOMBRE [1]", True, C_TEXT_YELLOW if is_active_h else C_TEXT_GRAY)
            self.screen.blit(lbl_h, lbl_h.get_rect(center=(btn_h.centerx, btn_h.bottom - 28)))

            is_active_m = (selected == "mujer") or hover_m
            pygame.draw.rect(self.screen, C_PLATFORM_DARK if is_active_m else (17, 17, 30), btn_m, border_radius=12)
            pygame.draw.rect(self.screen, C_PLATFORM_CYAN if is_active_m else (0, 85, 119), btn_m, 3 if is_active_m else 2, border_radius=12)
            self.screen.blit(self.img_m, (btn_m.centerx - 45, btn_m.y + 20))
            lbl_m = FONT_SUBTITLE.render("MUJER [2]", True, C_TEXT_YELLOW if is_active_m else C_TEXT_GRAY)
            self.screen.blit(lbl_m, lbl_m.get_rect(center=(btn_m.centerx, btn_m.bottom - 28)))

            inst = FONT_HUD.render("Presiona [ENTER] o Haz Clic para Jugar", True, C_PLATFORM_CYAN)
            self.screen.blit(inst, inst.get_rect(center=(cx, SCREEN_H - 60)))

            pygame.display.flip()


class ResultScreen:
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

            overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 230))
            screen.blit(overlay, (0, 0))

            cx, cy = SCREEN_W // 2, SCREEN_H // 2

            if won:
                msg = FONT_MSG.render("¡¡ GANASTE !!", True, C_TEXT_GREEN)
                sub = FONT_SUBTITLE.render("¡Has completado las 2 hamburguesas con éxito!", True, C_TEXT_WHITE)
            else:
                msg = FONT_MSG.render("GAME OVER", True, C_TEXT_RED)
                sub = FONT_SUBTITLE.render("¡La salchicha te ha alcanzado!", True, C_TEXT_WHITE)

            screen.blit(msg, msg.get_rect(center=(cx, cy - 50)))
            screen.blit(sub, sub.get_rect(center=(cx, cy + 15)))

            prompt = FONT_HUD.render("Presiona [R] o [ENTER] para Reiniciar - [ESC] Salir", True, C_TEXT_YELLOW)
            screen.blit(prompt, prompt.get_rect(center=(cx, cy + 85)))

            pygame.display.flip()


# ==============================================================================
# JUEGO PRINCIPAL
# ==============================================================================
class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
        pygame.display.set_caption("BurgerTime Arcade 2D")
        self.clock = pygame.time.Clock()
        self.hud = HUD()
        self.result = ResultScreen()
        self.score = 0
        self.hi_score = 28000

    def add_score(self, pts):
        self.score += pts
        if self.score > self.hi_score:
            self.hi_score = self.score

    def run(self):
        while True:
            char_select = CharacterSelectScreen(self.screen, self.clock)
            gender = char_select.run()

            level = LevelStructure()
            player = Player(gender, level)
            sausage = SausageEnemy(level)
            burgers = [
                BurgerStack(level.burger1_x, level),
                BurgerStack(level.burger2_x, level),
            ]

            game_state = "PLAYING"

            while game_state == "PLAYING":
                self.clock.tick(FPS)

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

                keys = pygame.key.get_pressed()
                player.handle_input(keys)
                player.update()

                sausage.update(player)

                all_pieces = []
                for b in burgers:
                    all_pieces.extend(b.pieces)
                for b in burgers:
                    b.update(all_pieces, sausage, player.rect, lambda pts: self.add_score(pts))

                # Sal -> Salchicha
                for salt in player.projectiles:
                    if salt.rect.colliderect(sausage.rect):
                        sausage.stun(FPS * 4)
                        salt.kill()
                        self.add_score(100)

                # Salchicha -> Jugador
                if not sausage.stunned and not player.stunned:
                    if player.rect.colliderect(sausage.rect):
                        player.take_hit()
                        player.reset_position()
                        sausage.reset_position()

                if player.lives <= 0:
                    game_state = "LOST"

                if all(b.is_complete() for b in burgers):
                    game_state = "WON"
                    self.add_score(2000)

                # Render
                level.draw(self.screen)
                for b in burgers:
                    b.draw(self.screen)
                sausage.draw(self.screen)
                player.draw(self.screen)
                self.hud.draw(self.screen, player, burgers, self.score, self.hi_score)

                pygame.display.flip()

            action = self.result.run(self.screen, self.clock, won=(game_state == "WON"))
            if action == "quit":
                pygame.quit()
                sys.exit()


if __name__ == "__main__":
    game = Game()
    game.run()
