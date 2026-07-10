import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addWishlist, getWishlist, removeWishlist } from './api';

export const useWishlist = () => useQuery({ queryKey: ['wishlist'], queryFn: getWishlist });

export const useWishlistActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist'] });

  return {
    add: useMutation({ mutationFn: addWishlist, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: removeWishlist, onSuccess: invalidate }),
  };
};
