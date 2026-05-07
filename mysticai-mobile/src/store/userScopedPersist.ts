import { zustandStorage } from '../utils/storage';
import { useAuthStore, type UserProfile } from './useAuthStore';

type PersistCapableStore = {
  setState: (nextState: any) => void;
  persist: {
    rehydrate: () => Promise<void> | void;
    setOptions: (options: { name: string }) => void;
  };
};

interface BindUserScopedPersistOptions {
  baseName: string;
  emptyState: Record<string, unknown>;
  store: PersistCapableStore;
}

const LEGACY_MIGRATION_FLAG_SUFFIX = ':user-scope-migrated:v1';

export function resolveUserScopeKey(user: UserProfile | null | undefined): string {
  if (user?.id != null) {
    return `user:${user.id}`;
  }

  const username = user?.username?.trim().toLowerCase();
  if (username) {
    return `username:${username}`;
  }

  const email = user?.email?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  return 'guest';
}

export function getCurrentUserScopeKey(): string {
  return resolveUserScopeKey(useAuthStore.getState().user);
}

export function buildUserScopedStorageKey(baseName: string, scopeKey: string): string {
  return `${baseName}:${scopeKey}`;
}

export function buildUserScopedStoreName(baseName: string, scopeKey: string): string {
  return buildUserScopedStorageKey(baseName, scopeKey);
}

export function getInitialUserScopedStoreName(baseName: string): string {
  return buildUserScopedStoreName(baseName, getCurrentUserScopeKey());
}

async function migrateLegacyStoreIfNeeded(baseName: string, scopedStoreName: string): Promise<void> {
  const migrationFlagKey = `${baseName}${LEGACY_MIGRATION_FLAG_SUFFIX}`;
  const alreadyMigrated = await zustandStorage.getItem(migrationFlagKey);
  if (alreadyMigrated) {
    return;
  }

  const legacyPayload = await zustandStorage.getItem(baseName);
  if (!legacyPayload) {
    return;
  }

  await zustandStorage.setItem(scopedStoreName, legacyPayload);
  await zustandStorage.setItem(migrationFlagKey, '1');
  await zustandStorage.removeItem(baseName);
}

export function bindUserScopedPersist({
  store,
  baseName,
  emptyState,
}: BindUserScopedPersistOptions): void {
  let activeScopeKey = resolveUserScopeKey(useAuthStore.getState().user);
  let scopeSyncChain: Promise<void> = Promise.resolve();

  const syncScope = async (scopeKey: string, force = false) => {
    if (!force && scopeKey === activeScopeKey) {
      return;
    }

    activeScopeKey = scopeKey;
    const scopedStoreName = buildUserScopedStoreName(baseName, scopeKey);
    store.persist.setOptions({ name: scopedStoreName });

    let scopedPayload = await zustandStorage.getItem(scopedStoreName);
    if (scopedPayload == null && scopeKey !== 'guest') {
      await migrateLegacyStoreIfNeeded(baseName, scopedStoreName);
      scopedPayload = await zustandStorage.getItem(scopedStoreName);
    }

    if (scopedPayload == null) {
      store.setState(emptyState);
      return;
    }

    await store.persist.rehydrate();
  };

  const enqueueScopeSync = (scopeKey: string, force = false) => {
    scopeSyncChain = scopeSyncChain
      .then(() => syncScope(scopeKey, force))
      .catch(() => {});
  };

  useAuthStore.subscribe((state, prevState) => {
    const nextScopeKey = resolveUserScopeKey(state.user);
    const prevScopeKey = resolveUserScopeKey(prevState.user);

    if (nextScopeKey !== prevScopeKey) {
      enqueueScopeSync(nextScopeKey);
    }
  });

  const authState = useAuthStore.getState();
  if (authState.isHydrated && authState.user) {
    enqueueScopeSync(resolveUserScopeKey(authState.user), true);
  }
}
