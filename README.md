# 🍔 BurgerTime Arcade 2D

Juego arcade 2D desarrollado en Python con **Pygame**, basado en las mecánicas clásicas del legendario juego arcade **BurgerTime** (1982).

---

## 🎮 Características del Juego

- **Selección de Personaje**: Pantalla inicial para elegir entre Chef Hombre y Chef Mujer con controles táctiles/ratón o teclado.
- **Física de Hamburguesas**:
  - 2 hamburguesas gigantes divididas en 4 secciones por piso.
  - Al caminar por encima de los 4 segmentos de un ingrediente, cae al piso inferior.
  - Caída en cadena: si un ingrediente golpea a otro por debajo, provoca su caída sucesiva.
  - Objetivo: armar 2 hamburguesas completas en los platos inferiores.
- **Enemigo Inteligente (Salchicha)**:
  - IA de persecución que navega entre plataformas y escaleras buscando al jugador.
  - Puede ser aplastado por ingredientes que caen o aturdido con sal.
- **Defensa con Sal (5 cargas)**:
  - Presiona `ESPACIO` para arrojar sal y congelar/aturdir al enemigo durante 4 segundos.
- **HUD & Sistema de Vidas**:
  - 3 vidas iniciales, indicador visual de sal restante y pantallas de **¡GANASTE!** y **GAME OVER** con opción de reinicio inmediato (`R` / `ENTER`).
- **Carga de Assets Resiliente**:
  - Soporta sprites personalizados en carpetas `/sprites` o `/ASSETS` con fallback procedural automático para evitar caídas si falta alguna imagen.

---

## 🛠️ Requisitos e Instalación

1. **Clonar o descargar el repositorio**:
   ```bash
   git clone https://github.com/estamos-sanando/bt.git
   cd bt
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar el juego**:
   ```bash
   python main.py
   ```

---

## 🕹️ Controles

| Acción | Tecla / Control |
| :--- | :--- |
| **Moverse / Escalar** | Flechas (`←` `↑` `→` `↓`) o `W` `A` `S` `D` |
| **Lanzar Sal** | Barra Espaciadora (`SPACE`) |
| **Elegir Personaje** | Clic en tarjeta, `1`/`H` (Hombre), `2`/`M` (Mujer) |
| **Reiniciar Partida** | `R` o `ENTER` |
| **Salir** | `ESC` |

---

## 📁 Estructura del Proyecto

```
├── ASSETS/            # Sprites del juego (personajes, enemigos, ingredientes)
├── main.py            # Código fuente principal del juego
├── requirements.txt   # Dependencias de Python (pygame)
├── .gitignore         # Archivos ignorados por git
└── README.md          # Documentación del proyecto
```
