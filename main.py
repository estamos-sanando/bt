"""
BurgerTime Arcade 2D Game (Python / Pygame)
Con 7 capas de ingredientes, caída inmediata por pisos al pisar y ensamble final en el plato.
"""

import pygame
import sys
import os
import math

# ==============================================================================
# CONFIGURACIÓN Y CONSTANTES GLOBALES
# ==============================================================================
SCREEN_W = 800
SCREEN_H = 700
FPS = 60

# Paleta Retro Arcade
C_BG = (12, 13, 20)
C_GIRDER_BASE = (30, 60, 114)
C_GIRDER_LIGHT = (42, 82, 152)
C_GIRDER_TOP = (255, 179, 0)
C_GIRDER_RIVET = (255, 224, 130)
C_LADDER_RAIL = (79, 195, 247)
C_LADDER_RUNG = (225, 245, 254)
C_YELLOW = (248, 204, 27)
C_RED = (231, 76, 60)
C_GREEN = (46, 204, 113)
C_WHITE = (255, 255, 255)
C_GRAY = (136, 136, 160)

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
FONT_SUBTITLE = pygame.font.SysFont("Arial, sans-serif", 20, bold=True)
FONT_HUD = pygame.font.SysFont("Consolas, Courier, monospace", 17, bold=True)
FONT_MSG = pygame.font.SysFont("Impact, Arial Black, sans-serif", 52)


# ==============================================================================
# GESTOR DE RECURSOS Y SPRITES
# ==============================================================================
class ResourceManager:
    _cache = {}

    @classmethod
    def load_image(cls, names, size=None, fallback_color=C_YELLOW):
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
# ESTRUCTURA DE NIVELES (7 PISOS + BASE DE PLATOS)
# ==============================================================================
FLOOR_Y_COORDS = [100, 178, 256, 334, 412, 490, 568, 646]

LADDERS_DATA = [
    (70,  100, 178, 32),
    (384, 100, 178, 32),
    (700, 100, 178, 32),
    (230, 178, 256, 32),
    (538, 178, 256, 32),
    (70,  256, 334, 32),
    (384, 256, 334, 32),
    (700, 256, 334, 32),
    (230, 334, 412, 32),
    (538, 334, 412, 32),
    (70,  412, 490, 32),
    (384, 412, 490, 32),
    (700, 412, 490, 32),
    (230, 490, 568, 32),
    (538, 490, 568, 32),
    (70,  568, 646, 32),
    (384, 568, 646, 32),
    (700, 568, 646, 32),
]


class Ladder:
    def __init__(self, x, top_y, bottom_y, w=32):
        self.x = x
        self.top_y = top_y
        self.bottom_y = bottom_y
        self.w = w

    def contains_point(self, cx, cy, range_x=24):
        if abs(cx - (self.x + self.w / 2)) <= range_x:
            return self.top_y - 8 <= cy <= self.bottom_y + 8
        return False

    def is_below(self, cx, feet_y, range_x=24):
        if abs(cx - (self.x + self.w / 2)) <= range_x:
            return abs(feet_y - self.top_y) <= 10
        return False


class LevelStructure:
    def __init__(self):
        self.floors_y = FLOOR_Y_COORDS
        self.floor_thickness = 12
        self.ladders = [Ladder(x, top, btm, w) for (x, top, btm, w) in LADDERS_DATA]
        self.burger1_x = 100
        self.burger2_x = 540

    def find_ladder_at(self, cx, cy, range_x=24):
        for lad in self.ladders:
            if lad.contains_point(cx, cy, range_x):
                return lad
        return None

    def find_ladder_below(self, cx, feet_y, range_x=24):
        for lad in self.ladders:
            if lad.is_below(cx, feet_y, range_x):
                return lad
        return None

    def draw(self, surface):
        surface.fill(C_BG)

        for lad in self.ladders:
            lx, top, btm, lw = lad.x, lad.top_y, lad.bottom_y, lad.w
            lh = btm - top
            pygame.draw.rect(surface, C_LADDER_RAIL, (lx + 4, top, 4, lh))
            pygame.draw.rect(surface, C_LADDER_RAIL, (lx + lw - 8, top, 4, lh))
            for ry in range(top + 6, btm, 12):
                pygame.draw.rect(surface, C_LADDER_RUNG, (lx + 4, ry, lw - 12, 3))

        for fy in self.floors_y:
            fh = self.floor_thickness
            pygame.draw.rect(surface, C_GIRDER_BASE, (0, fy, SCREEN_W, fh))
            for gx in range(0, SCREEN_W, 28):
                pygame.draw.rect(surface, C_GIRDER_LIGHT, (gx, fy + 3, 14, fh - 6))
            pygame.draw.rect(surface, C_GIRDER_TOP, (0, fy, SCREEN_W, 3))
            for rx in range(14, SCREEN_W, 56):
                pygame.draw.circle(surface, C_GIRDER_RIVET, (rx, fy + fh // 2 + 1), 2)

        plate_y = 646 + 6
        for bx in [self.burger1_x, self.burger2_x]:
            pw = 160
            px = bx - 10
            pygame.draw.ellipse(surface, (0, 0, 0), (px - 6, plate_y + 4, pw + 12, 14))
            pygame.draw.ellipse(surface, (224, 224, 234), (px - 6, plate_y, pw + 12, 14))
            pygame.draw.ellipse(surface, (159, 168, 218), (px - 6, plate_y, pw + 12, 14), 2)


# ==============================================================================
# PROYECTIL DE SAL
# ==============================================================================
class SaltCloud(pygame.sprite.Sprite):
    def __init__(self, x, y, direction):
        super().__init__()
        self.direction = direction
        self.speed = 8
        self.w, self.h = 28, 28
        self.rect = pygame.Rect(x, y, self.w, self.h)
        self.lifetime = 24
        self.image = ResourceManager.load_image(["sal.png", "hombresal.png"], size=(self.w, self.h), fallback_color=C_WHITE)

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
  "pan_superior": {"sprite": ["arribapan.png", "pan_superior.png"], "h": 38, "overlap": 10},
  "cebolla":      {"sprite": ["cebolla.png"],                       "h": 28, "overlap": 12},
  "bacon":        {"sprite": ["bacon.png"],                         "h": 28, "overlap": 10},
  "queso":        {"sprite": ["queso.png"],                         "h": 24, "overlap": 8 },
  "paty":         {"sprite": ["paty.png", "carne.png"],             "h": 30, "overlap": 8 },
  "mayonesa":     {"sprite": ["mayonesa.png"],                      "h": 24, "overlap": 10},
  "pan_inferior": {"sprite": ["abajopan.png", "pan_inferior.png"], "h": 34, "overlap": 0 },
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

        self.w = 140
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

        self.image = ResourceManager.load_image(self.info["sprite"], size=(self.w, self.h), fallback_color=C_YELLOW)

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def check_player_step(self, player_rect):
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
                    self.step_offsets[seg_idx] = 4.0

            stepped_count = sum(1 for s in self.stepped if s)
            if stepped_count >= 2 or all(self.stepped):
                self.trigger_fall()

    def trigger_fall(self):
        if self.falling or self.landed_on_plate:
            return

        if self.floor_idx < len(self.level.floors_y) - 1:
            self.falling = True
            self.fall_speed = 3.6
            self.target_floor_idx = self.floor_idx + 1
            self.stepped = [False] * 4
            self.step_offsets = [0.0] * 4

    def update(self, all_pieces, sausage):
        if self.falling:
            self.fall_speed = min(self.fall_speed + 0.45, 9.5)
            self.y += self.fall_speed

            if sausage and not sausage.stunned:
                if self.rect.colliderect(sausage.rect):
                    sausage.stun(FPS * 5)

            # Caída en cadena
            for other in all_pieces:
                if other is self or other.start_x != self.start_x:
                    continue
                if other.floor_idx == self.target_floor_idx and not other.falling and not other.landed_on_plate:
                    if self.y + self.h >= other.y:
                        other.trigger_fall()

            # Aterrizar en el piso objetivo
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

    def update(self, all_pieces, sausage, player_rect):
        for p in self.pieces:
            p.check_player_step(player_rect)
            p.update(all_pieces, sausage)

        # Apilado perfecto en la base (Imagen 2)
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
        self.w = 32
        self.h = 42
        self.speed = 3.4
        self.climb_speed = 3.0

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
        self.x = 20.0
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
            sx = self.rect.right if self.facing == 1 else self.rect.left - 26
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
                lad_below = self.level.find_ladder_below(cx, feet_y, 26)
                if lad_below:
                    self.is_climbing = True
                    self.current_ladder = lad_below
                    self.x = lad_below.x + lad_below.w / 2 - self.w / 2
                    self.y += 6
                    moved = True
                    self.current_action = "walk"

            if (keys[pygame.K_UP] or keys[pygame.K_w]) and not self.is_climbing:
                lad_near = self.level.find_ladder_at(cx, center_y, 26)
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

                p_box = self.rect
                for fy in self.level.floors_y:
                    if self.vy > 0 and p_box.bottom >= fy and p_box.bottom - self.vy <= fy + 12:
                        self.y = float(fy - self.h)
                        self.vy = 0.0
                        break

        if not moved and self.current_action != "salt":
            self.current_action = "idle"

        self.x = max(0.0, min(self.x, float(SCREEN_W - self.w)))
        if self.y < 40:
            self.y = 40.0

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
        self.w = 32
        self.h = 42
        self.speed = 1.9
        self.climb_speed = 1.7

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
        self.x = 720.0
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
            if dy < -10:
                self.y -= self.climb_speed
                if self.y + self.h <= lad.top_y + 4:
                    self.y = float(lad.top_y - self.h)
                    self.is_climbing = False
            elif dy > 10:
                self.y += self.climb_speed
                if self.y + self.h >= lad.bottom_y:
                    self.y = float(lad.bottom_y - self.h)
                    self.is_climbing = False
            else:
                self.is_climbing = False
        else:
            if abs(dy) > 25:
                lad = self.level.find_ladder_at(my_cx, my_cy, 45)
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

                for fy in self.level.floors_y:
                    if self.vy > 0 and self.y + self.h >= fy and self.y + self.h - self.vy <= fy + 12:
                        self.y = float(fy - self.h)
                        self.vy = 0.0
                        break

        self.x = max(0.0, min(self.x, float(SCREEN_W - self.w)))

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
            tint.fill((100, 200, 255, 120), special_flags=pygame.BLEND_RGBA_ADD)
            surface.blit(tint, (int(self.x), int(self.y)))
        else:
            surface.blit(img, (int(self.x), int(self.y)))


# ==============================================================================
# HUD
# ==============================================================================
class HUD:
    def draw(self, surface, player, burgers):
        panel = pygame.Surface((SCREEN_W, 42), pygame.SRCALPHA)
        panel.fill((10, 10, 20, 230))
        surface.blit(panel, (0, 0))
        pygame.draw.line(surface, C_GIRDER_TOP, (0, 42), (SCREEN_W, 42), 2)

        txt_v = FONT_HUD.render(f"VIDAS: {player.lives}/3", True, C_RED if player.lives <= 1 else C_WHITE)
        surface.blit(txt_v, (24, 11))
        for i in range(player.lives):
            pygame.draw.circle(surface, C_RED, (160 + i * 18, 21), 6)

        txt_s = FONT_HUD.render(f"SAL: {player.salt_count}/5", True, C_YELLOW if player.salt_count > 0 else C_GRAY)
        surface.blit(txt_s, (330, 11))
        for i in range(player.salt_count):
            pygame.draw.rect(surface, C_WHITE, (440 + i * 14, 15, 8, 12), border_radius=2)

        completed = sum(1 for b in burgers if b.is_complete())
        txt_b = FONT_HUD.render(f"BURGERS: {completed}/2", True, C_GREEN)
        surface.blit(txt_b, (600, 11))


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

            sub = FONT_SUBTITLE.render("SELECCIONA TU PERSONAJE", True, C_WHITE)
            self.screen.blit(sub, sub.get_rect(center=(cx, 140)))

            is_active_h = (selected == "hombre") or hover_h
            pygame.draw.rect(self.screen, (40, 53, 147) if is_active_h else (26, 26, 46), btn_h, border_radius=14)
            pygame.draw.rect(self.screen, C_YELLOW if is_active_h else (63, 81, 181), btn_h, 4 if is_active_h else 2, border_radius=14)
            self.screen.blit(self.img_h, (btn_h.centerx - 45, btn_h.y + 20))
            lbl_h = FONT_SUBTITLE.render("HOMBRE [1]", True, C_YELLOW if is_active_h else C_GRAY)
            self.screen.blit(lbl_h, lbl_h.get_rect(center=(btn_h.centerx, btn_h.bottom - 28)))

            is_active_m = (selected == "mujer") or hover_m
            pygame.draw.rect(self.screen, (40, 53, 147) if is_active_m else (26, 26, 46), btn_m, border_radius=14)
            pygame.draw.rect(self.screen, C_YELLOW if is_active_m else (63, 81, 181), btn_m, 4 if is_active_m else 2, border_radius=14)
            self.screen.blit(self.img_m, (btn_m.centerx - 45, btn_m.y + 20))
            lbl_m = FONT_SUBTITLE.render("MUJER [2]", True, C_YELLOW if is_active_m else C_GRAY)
            self.screen.blit(lbl_m, lbl_m.get_rect(center=(btn_m.centerx, btn_m.bottom - 28)))

            inst = FONT_HUD.render("Presiona [ENTER] o Haz Clic para Jugar", True, (128, 216, 255))
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
            overlay.fill((10, 10, 20, 230))
            screen.blit(overlay, (0, 0))

            cx, cy = SCREEN_W // 2, SCREEN_H // 2

            if won:
                msg = FONT_MSG.render("¡¡ GANASTE !!", True, C_GREEN)
                sub = FONT_SUBTITLE.render("¡Has completado las 2 hamburguesas con éxito!", True, C_WHITE)
            else:
                msg = FONT_MSG.render("GAME OVER", True, C_RED)
                sub = FONT_SUBTITLE.render("¡La salchicha te ha alcanzado!", True, C_WHITE)

            screen.blit(msg, msg.get_rect(center=(cx, cy - 50)))
            screen.blit(sub, sub.get_rect(center=(cx, cy + 15)))

            prompt = FONT_HUD.render("Presiona [R] o [ENTER] para Reiniciar - [ESC] Salir", True, C_YELLOW)
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
                    b.update(all_pieces, sausage, player.rect)

                # Sal -> Salchicha
                for salt in player.projectiles:
                    if salt.rect.colliderect(sausage.rect):
                        sausage.stun(FPS * 4)
                        salt.kill()

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

                # Render
                level.draw(self.screen)
                for b in burgers:
                    b.draw(self.screen)
                sausage.draw(self.screen)
                player.draw(self.screen)
                self.hud.draw(self.screen, player, burgers)

                pygame.display.flip()

            action = self.result.run(self.screen, self.clock, won=(game_state == "WON"))
            if action == "quit":
                pygame.quit()
                sys.exit()


if __name__ == "__main__":
    game = Game()
    game.run()
