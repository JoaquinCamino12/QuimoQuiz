
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// --- INSTRUCCIONES ---
// 1. Descarga tu clave de cuenta de servicio de Firebase:
//    - Ve a la Consola de Firebase -> Configuración del proyecto -> Cuentas de servicio.
//    - Haz clic en "Generar nueva clave privada" y descarga el archivo JSON.
//    - Renombra el archivo a "service-account.json" y colócalo en la carpeta "scripts".
//    - ¡IMPORTANTE! NUNCA compartas este archivo. Añádelo a tu .gitignore si tu proyecto es público.
//
// 2. Ejecuta el script desde tu terminal:
//    npm run seed
// ---------------------

const serviceAccountPath = resolve(__dirname, 'service-account.json');
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

} catch (error) {
  console.error('Error: No se pudo encontrar o leer el archivo "service-account.json".');
  console.error('Por favor, sigue las instrucciones en la parte superior del archivo scripts/seed.ts.');
  process.exit(1);
}

const db = admin.firestore();
const questionsPath = resolve(process.cwd(), 'seed.json');
const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));

async function seedDatabase() {
  const collectionRef = db.collection('PreguntasGlobales');
  
  console.log(`Comenzando la carga de ${questions.length} preguntas...`);

  // Deshabilita la persistencia para este script
  await db.settings({ persistence: false });

  // Borra la colección existente para evitar duplicados
  console.log('Borrando la colección "PreguntasGlobales" existente...');
  const snapshot = await collectionRef.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    console.log('No hay documentos que borrar.');
  } else {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Se borraron ${batchSize} documentos.`);
  }

  // Sube las nuevas preguntas
  let count = 0;
  for (const question of questions) {
    try {
      await collectionRef.add(question);
      count++;
      process.stdout.write(`Progreso: ${count} / ${questions.length}\r`);
    } catch (error) {
      console.error('\nError al añadir la pregunta:', question);
      console.error(error);
    }
  }

  console.log(`\n¡Carga completada! Se añadieron ${count} preguntas a la colección "PreguntasGlobales".`);
}

seedDatabase().catch((error) => {
  console.error('Ocurrió un error inesperado durante la carga de datos:', error);
});
