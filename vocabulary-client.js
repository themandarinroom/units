import { getFirebaseServices } from "./firebase.js";

const COLLECTION = "vocabularySets";

export async function listVocabularySets() {
  const services = await getFirebaseServices();
  const query = services.firestoreSdk.query(
    services.firestoreSdk.collection(services.db, COLLECTION),
    services.firestoreSdk.where("published", "==", true)
  );
  const snapshot = await services.firestoreSdk.getDocs(query);
  return snapshot.docs
    .map(doc => ({ docId: doc.id, ...doc.data() }))
    .filter(set => set.deleted !== true)
    .map(set => ({
      id: String(set.id || set.docId),
      yearLevel: Number(set.yearLevel) || 0,
      title: String(set.title || ""),
      chineseTitle: String(set.chineseTitle || ""),
      itemCount: Array.isArray(set.items) ? set.items.length : 0
    }))
    .sort((a, b) => a.yearLevel - b.yearLevel || a.title.localeCompare(b.title));
}
