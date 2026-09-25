/**
 * Crea (o actualiza) las cuentas fijas de acceso al sistema, con su rol
 * correspondiente. Las contraseñas quedan guardadas de forma segura dentro
 * de Firebase Authentication — nunca en el código del sitio web.
 *
 * 1) EDITA la lista ACCOUNTS de abajo con los correos y contraseñas que
 *    quieras usar.
 * 2) Requiere scripts/serviceAccountKey.json y haber corrido "npm install"
 *    dentro de scripts/ (igual que seed.js).
 * 3) node create-accounts.js
 *
 * Puedes correrlo de nuevo más adelante para cambiar una contraseña: si el
 * correo ya existe, solo actualiza su contraseña y su rol.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require("./serviceAccountKey.json");

// -----------------------------------------------------------------------
// EDITA ESTO con tus propios correos y contraseñas antes de correr el script
const ACCOUNTS = [
  { email: "agebre@ugel03.gob.pe", password: "agebre_2026", role: "admin" },
  {
    email: "generica@ugel03.gob.pe",
    password: "generica_2026",
    role: "general",
  },
];
// -----------------------------------------------------------------------

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  for (const acc of ACCOUNTS) {
    if (acc.password.startsWith("CAMBIA-ESTA-CLAVE")) {
      console.error(
        "Todavía no editaste la contraseña de " +
          acc.email +
          " en este archivo. Abre create-accounts.js y reemplázala, luego vuelve a correr el script.",
      );
      process.exit(1);
    }
    let user;
    try {
      user = await auth.getUserByEmail(acc.email);
      await auth.updateUser(user.uid, { password: acc.password });
      console.log("Contraseña actualizada para", acc.email);
    } catch (e) {
      user = await auth.createUser({
        email: acc.email,
        password: acc.password,
        emailVerified: true,
      });
      console.log("Cuenta creada:", acc.email);
    }
    await db
      .collection("roles")
      .doc(user.uid)
      .set(
        { email: acc.email, role: acc.role, createdAt: Date.now() },
        { merge: true },
      );
    console.log("  → rol asignado:", acc.role);
  }

  // Evita que cualquier otra cuenta se auto-asigne admin más adelante.
  await db
    .collection("meta")
    .doc("bootstrap")
    .set({ claimed: true }, { merge: true });

  console.log(
    "\nListo. Ya puedes iniciar sesión en el sitio con esos correos y contraseñas.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
