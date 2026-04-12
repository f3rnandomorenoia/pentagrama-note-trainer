# Pentagrama Piano Trainer

Aplicación web estática para practicar lectura de notas en pentagrama para piano, en español, pensada para desplegarse directamente en GitHub Pages.

La rama principal corresponde a la iteración `v2.5`: flujo continuo, más directo y más orientado a juego móvil. La `v2.1` es la base publicada anterior y la `v1.0` queda preservada en su tag.

## Acceso web

Puedes usar la versión publicada en GitHub Pages aquí:

- https://f3rnandomorenoia.github.io/pentagrama-note-trainer/

## Qué hace

- Entrena **clave de sol** y **clave de fa**.
- Mantiene una **barra vertical fija en el centro** mientras la nota se desplaza de derecha a izquierda.
- Encadena notas de forma **continua**, sin pulsar "siguiente".
- Destaca de forma clara la **última nota resuelta**, en verde o rojo según acierto o fallo.
- Permite responder con el nombre correcto de la nota, incluyendo **sostenidos** y **bemoles** en niveles avanzados.
- Suma **+10 puntos** por acierto y resta **-5** por fallo.
- Guarda mejores sesiones en **localStorage**.
- Incluye **modo práctica** y **modo desafío**.
- Presenta **botones compactos táctiles** pensados para pantallas estrechas.
- Al pulsar **Empezar sesión**, cada nivel entra en un **modo juego enfocado** que reduce el resto del chrome en móvil.
- Da feedback pedagógico sobre la posición de la nota en línea, espacio o línea adicional.

## Estructura del proyecto

```text
.
├── index.html                    # Web principal con enlaces a cada nivel
├── niveles/
│   ├── nivel-1.html
│   ├── nivel-2.html
│   ├── nivel-3.html
│   ├── nivel-4.html
│   └── nivel-5.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js               # Script compartido por todas las páginas de nivel
│       ├── game.js              # Lógica del juego
│       ├── levels.js            # Configuración de niveles
│       ├── staff.js             # Render SVG del pentagrama y utilidades de notas
│       └── storage.js           # Persistencia en localStorage
└── README.md
```

## Niveles

1. **Nivel 1** — clave de sol básica
2. **Nivel 2** — clave de fa básica
3. **Nivel 3** — mezcla de claves
4. **Nivel 4** — rango ampliado con líneas adicionales
5. **Nivel 5** — alteraciones (sostenidos y bemoles)

Cada nivel tiene su propia página HTML, pero todos comparten el mismo JavaScript y CSS. En `v2`, la misma página cambia a un estado de juego enfocado cuando empieza la sesión, con HUD compacto, salida rápida y reinicio sin crear nuevas rutas.

## Ejecutar localmente

No requiere compilación. Puedes abrir `index.html` directamente o servir la carpeta con un servidor estático.

Ejemplo:

```bash
python3 -m http.server 8080
```

Después abre:

```text
http://localhost:8080
```

## Deploy en GitHub Pages

1. Sube el proyecto a un repositorio público de GitHub.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama **main** y la carpeta **/ (root)**.
5. Guarda los cambios.
6. GitHub publicará la web principal (`index.html`) y desde ahí podrás entrar en cada nivel.

URL actual publicada:
- https://f3rnandomorenoia.github.io/pentagrama-note-trainer/

## Idea pedagógica

La intención es asociar visualmente la posición de cada nota con su nombre real, no solo memorizar botones. En `v2.5` eso ocurre con una barra fija y notas que fluyen hacia ella, más cercano a un carril rítmico móvil, pero manteniendo el feedback pedagógico tras cada acierto o fallo.
