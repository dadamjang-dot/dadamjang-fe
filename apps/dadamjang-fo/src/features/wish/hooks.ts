import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addWish, getWishlist, removeWish } from './api';

export const useWishlist = () => useQuery({ queryKey: ['wishlist'], queryFn: getWishlist });

export const useWishActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist'] });

  return {
    add: useMutation({ mutationFn: addWish, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: removeWish, onSuccess: invalidate }),
  };
};
