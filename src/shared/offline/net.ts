import NetInfo from '@react-native-community/netinfo';

/** Réseau utilisable : false seulement si la couche confirme l’absence de connexion. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}
