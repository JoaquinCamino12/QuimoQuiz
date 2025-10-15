# 🚀🧠 Quimo-Quiz Global

¡Bienvenido a **Quimo-Quiz Global**! Una aplicación de trivia moderna, interactiva y de ritmo rápido diseñada para desafiar tus conocimientos en una variedad de categorías. Construida con las últimas tecnologías web, esta aplicación ofrece una experiencia de usuario fluida y atractiva.

Pruebalo Aqui [QuimoQuiz](https://studio--studio-5703333971-e616b.us-central1.hosted.app/)
## ✨ Características Principales

- **🎨 Interfaz Moderna:** Diseño limpio y atractivo creado con **ShadCN UI** y **Tailwind CSS**.
- **🧠 Múltiples Categorías:** Elige entre una amplia gama de temas como Cultura General, Cine/TV, Ciencia, Música, ¡y más!
- **🕹️ Modos de Juego:**
  - **10 Preguntas:** Un desafío rápido para poner a prueba tus conocimientos.
  - **Supervivencia:** ¿Cuántas preguntas puedes responder correctamente antes de cometer 3 errores?
- **🏆 Sistema de Puntuación:** Gana puntos por cada respuesta correcta, con bonificaciones por rachas y por responder rápidamente.
- **📊 Resultados Detallados:** Revisa tu rendimiento al final de cada partida con un resumen completo.
- **🔥 Base de Datos en Tiempo Real:** Utiliza **Firebase Firestore** para almacenar y obtener preguntas de forma dinámica.
- **📱 Totalmente Responsivo:** Disfruta de una experiencia perfecta en cualquier dispositivo, ya sea móvil o de escritorio.
- **⚔️ Modo PVP en Tiempo Real:** ¡Crea salas de juego privadas, invita a tus amigos y compite en tiempo real para ver quién es el verdadero campeón de la trivia!
- **룸 Gestión de Salas:** Sistema completo para crear y unirse a partidas mediante un código de sala único.
- **🔄 Sincronización Instantánea:** Gracias a Firebase Firestore, todas las acciones (respuestas, puntuaciones, avance de preguntas) se reflejan al instante para todos los jugadores en la sala.
---

## 🛠️ Tecnologías Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [Shadcn/ui](https://ui.shadcn.com/)
- **Base de Datos:** [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Iconos:** [Lucide React](https://lucide.dev/)

---

## ⚙️ Configuración y Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local.

### Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- Una cuenta de [Firebase](https://firebase.google.com/)

### 1. Clonar el Repositorio

Primero, clona este repositorio en tu máquina local:

```bash
git clone https://github.com/JoaquinCamino12/QuimoQuiz.git
cd QuimoQuiz
```

### 2. Instalar Dependencias

Instala todas las dependencias del proyecto utilizando npm:

```bash
npm install
```

### 3. Configurar Firebase

Para que la aplicación se conecte a tu base de datos de Firestore, necesitas configurar tus credenciales de Firebase.

#### a. Obtener la Clave de Cuenta de Servicio

1.  Ve a la **Consola de Firebase** de tu proyecto.
2.  Haz clic en el ícono de engranaje (⚙️) junto a "Project Overview" y selecciona **Configuración del proyecto**.
3.  Ve a la pestaña **Cuentas de servicio**.
4.  Haz clic en el botón **"Generar nueva clave privada"**.
5.  Se descargará un archivo JSON. Renómbralo a `service-account.json`.
6.  Mueve este archivo a la carpeta `scripts/` en la raíz de tu proyecto.

> **¡Importante!** El archivo `service-account.json` contiene claves sensibles. Ya está incluido en el `.gitignore` para evitar que se suba accidentalmente a tu repositorio.

#### b. Poblar la Base de Datos

El proyecto incluye un archivo `seed.json` con cientos de preguntas listas para ser cargadas en tu base de datos. Para hacerlo, ejecuta el siguiente comando en tu terminal:

```bash
npm run seed
```

Este script se conectará a tu Firestore, borrará cualquier pregunta existente en la colección `PreguntasGlobales` y subirá todas las preguntas del archivo `seed.json`.

### 4. Ejecutar el Proyecto

Una vez completados los pasos anteriores, ¡estás listo para lanzar la aplicación!

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:9002](http://localhost:9002).

---

## 👨‍💻 Creado por

Este proyecto fue desarrollado con ❤️ por **Joaquín Camino**.

- **Portafolio:** [joaquincamino.netlify.app](https://joaquincamino.netlify.app)
- **GitHub:** [@JoaquinCamino12](https://github.com/JoaquinCamino12)
