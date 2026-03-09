import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFavoriteNames, removeFavoriteName, toggleFavoriteName, type NameListItem } from '../services/name.service';

const FAVORITES_QUERY_KEY = ['names', 'favorites'] as const;

export function useNameFavorites() {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: listFavoriteNames,
  });

  const toggleMutation = useMutation({
    mutationFn: (item: NameListItem) => toggleFavoriteName(item),
    onSuccess: (next) => {
      queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (nameId: number) => removeFavoriteName(nameId),
    onSuccess: (next) => {
      queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
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
