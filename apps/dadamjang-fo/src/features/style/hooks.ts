import { useState, useEffect } from 'react';
import { getStylePosts } from './api';
import type { StylePost } from './types';

export const useStylePost = (id: string) => {
  const { posts, loading, toggleLike } = useStylePosts();
  const post = posts.find((p) => p.id === id);
  return { post, loading, toggleLike };
};

export const useStylePosts = () => {
  const [posts, setPosts] = useState<StylePost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    getStylePosts().then((data) => {
      if (active) {
        setPosts(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const addPost = (caption: string, imageUrl?: string) => {
    const newPost: StylePost = {
      id: `post-${Date.now()}`,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=60',
      author: 'me_dadamjang',
      caption,
      likes: 0,
      isPartner: false,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  return { posts, loading, addPost, toggleLike };
};
