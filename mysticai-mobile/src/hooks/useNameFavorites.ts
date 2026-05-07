import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFavoriteNames, removeFavoriteName, toggleFavoriteName, type NameListItem } from '../services/name.service';
import { useAuthStore } from '../store/useAuthStore';
import { resolveUserScopeKey } from '../store/userScopedPersist';

export function useNameFavorites() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userScopeKey = resolveUserScopeKey(user);
  const queryKey = ['names', 'favorites', userScopeKey] as const;

  const favoritesQuery = useQuery({
    queryKey,
    queryFn: listFavoriteNames,
  });

  const toggleMutation = useMutation({
    mutationFn: (item: NameListItem) => toggleFavoriteName(item),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (nameId: number) => removeFavoriteName(nameId),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const favorites = favoritesQuery.data ?? [];
  const favoriteIds = new Set(favorites.map((item) => item.id));

  return {
    favorites,
    favoriteIds,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    isFavorite: (nameId: number) => favoriteIds.has(nameId),
    toggleFavorite: (item: NameListItem) => toggleMutation.mutate(item),
    removeFavorite: (nameId: number) => removeMutation.mutate(nameId),
    isToggling: toggleMutation.isPending || removeMutation.isPending,
    refetch: favoritesQuery.refetch,
  };
}
