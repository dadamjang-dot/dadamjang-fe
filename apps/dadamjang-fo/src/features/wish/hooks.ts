import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addWish, getWish, removeWish } from './api';

export const useWish = () => useQuery({ queryKey: ['wish'], queryFn: getWish });

export const useWishActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wish'] });

  return {
    add: useMutation({ mutationFn: addWish, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: removeWish, onSuccess: invalidate }),
  };
};
