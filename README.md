# Pentagrama Piano Trainer

Aplicación web estática para practicar lectura de notas en pentagrama para piano, en español, pensada para desplegarse directamente en GitHub Pages.

La rama principal corresponde a la iteración `v2`: flujo continuo, más directo y más orientado a juego móvil. La `v1.0` queda preservada en su tag.

## Qué hace

- Entrena **clave de sol** y **clave de fa**.
- Usa una **línea vertical animada** que avanza hacia la nota objetivo.
- Encadena notas de forma **continua**, sin pulsar "siguiente".
- Permite responder con el nombre correcto de la nota, incluyendo **sostenidos** y **bemoles** en niveles avanzados.
- Suma **+10 puntos** por acierto y resta **-5** por fallo.
- Guarda mejores sesiones en **localStorage**.
- Incluye **modo práctica** y **modo desafío**.
- Presenta **botones compactos táctiles** pensados para pantallas estrechas.
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

Cada nivel tiene su propia página HTML, pero todos comparten el mismo JavaScript y CSS.

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

## Idea pedagógica

La intención es asociar visualmente la posición de cada nota con su nombre real, no solo memorizar botones. En `v2` eso ocurre con un ritmo más seguido, más cercano a una app de entrenamiento móvil, pero manteniendo el feedback pedagógico tras cada acierto o fallo.
