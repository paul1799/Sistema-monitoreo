/* =========================================================================
   firestore.js — Funciones exclusivas para interactuar con Firestore.
   Expone un adaptador (makeDbAdapter) que envuelve la API de Firestore con
   una interfaz simple: dbNs.collection(...).doc(...).get()/set()/update()...
   ========================================================================= */

import {
  getFirestore,
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
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export { getFirestore };

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
        commit() {
          return b.commit();
        }
      };
    }
  };
}
