/* =========================================================================
   firestore.js — Funciones exclusivas para interactuar con Firestore.
   Expone un adaptador (makeDbAdapter) que envuelve la API de Firestore con
   una interfaz simple: dbNs.collection(...).doc(...).get()/set()/update()...
   ========================================================================= */

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where as fbWhere,
  orderBy as fbOrderBy,
  limit as fbLimit,
  writeBatch,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export { getFirestore, runTransaction };

/**
 * Inicializa la instancia de Firestore optimizada para redes institucionales y gubernamentales
 * (como UGEL / MINEDU) donde firewalls o proxys bloquean o cierran WebSockets y streams WebChannel,
 * provocando errores 'Listen' / 'Write' stream transport errored (404 / status: 1) y bloqueos en guardado.
 * Usa long-polling forzado y cache persistente local en IndexedDB con soporte multi-pestaña.
 * @param {import('firebase/app').FirebaseApp} firebaseApp
 * @returns {import('firebase/firestore').Firestore}
 */
export function initFirestore(firebaseApp) {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e1) {
    console.warn('initFirestore: no se pudo inicializar con persistentLocalCache, intentando fallback sin cache de pestañas:', e1);
    try {
      return initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true
      });
    } catch (e2) {
      console.warn('initFirestore: fallback a getFirestore por:', e2);
      return getFirestore(firebaseApp);
    }
  }
}

/**
 * Thin adapter que permite usar dbNs.collection(...).doc(...).set()/add()/
 * delete()/onSnapshot() exactamente igual que antes, pero respaldado por
 * Firebase Firestore real.
 * @param {import('firebase/firestore').Firestore} firestoreDb
 */
export function makeDbAdapter(firestoreDb) {
  function wrapDoc(ref) {
    return {
      id: ref.id,
      path: ref.path,
      _ref: ref,
      get() {
        return getDoc(ref).then(s => ({ id: s.id, exists: s.exists(), data: () => s.data() }));
      },
      set(data, opts) { return opts ? setDoc(ref, data, opts) : setDoc(ref, data); },
      update(data) { return updateDoc(ref, data); },
      delete() { return deleteDoc(ref); },
    };
  }

  function wrapQuery(colRef, constraints) {
    return {
      where(field, op, value) {
        return wrapQuery(colRef, [...constraints, fbWhere(field, op, value)]);
      },
      orderBy(field, dir) {
        return wrapQuery(colRef, [...constraints, fbOrderBy(field, dir || 'asc')]);
      },
      limit(n) {
        return wrapQuery(colRef, [...constraints, fbLimit(n)]);
      },
      doc(id) {
        return wrapDoc(id ? doc(firestoreDb, colRef.path, id) : doc(colRef));
      },
      add(data) {
        return addDoc(colRef, data).then(ref => wrapDoc(ref));
      },
      get() {
        const q = constraints.length ? query(colRef, ...constraints) : colRef;
        return getDocs(q).then(snap => ({
          docs: snap.docs.map(d => ({ id: d.id, data: () => d.data() })),
        }));
      },
      onSnapshot(cb, errCb) {
        const q = constraints.length ? query(colRef, ...constraints) : colRef;
        return onSnapshot(q, snap => {
          cb({ docs: snap.docs.map(d => ({ id: d.id, data: () => d.data() })) });
        }, errCb);
      },
    };
  }

  return {
    collection(path) {
      return wrapQuery(collection(firestoreDb, path), []);
    },
    batch() {
      const b = writeBatch(firestoreDb);
      return {
        set(docWrapper, data, opts) {
          const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
          opts ? b.set(r, data, opts) : b.set(r, data);
          return this;
        },
        delete(docWrapper) {
          const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
          b.delete(r);
          return this;
        },
        update(docWrapper, data) {
          const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
          b.update(r, data);
          return this;
        },
        commit() {
          return b.commit();
        }
      };
    },
    runTransaction(fn) {
      return runTransaction(firestoreDb, async (fbTx) => {
        const txAdapter = {
          async get(docWrapper) {
            const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
            const snap = await fbTx.get(r);
            return { id: snap.id, exists: snap.exists(), data: () => snap.data() };
          },
          set(docWrapper, data, opts) {
            const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
            opts ? fbTx.set(r, data, opts) : fbTx.set(r, data);
            return this;
          },
          update(docWrapper, data) {
            const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
            fbTx.update(r, data);
            return this;
          },
          delete(docWrapper) {
            const r = docWrapper._ref || (typeof docWrapper === 'string' ? doc(firestoreDb, docWrapper) : docWrapper);
            fbTx.delete(r);
            return this;
          }
        };
        return fn(txAdapter);
      });
    }
  };
}
