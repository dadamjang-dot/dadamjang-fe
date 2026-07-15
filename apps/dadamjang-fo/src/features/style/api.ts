import type { StylePost } from './types';

const mockPosts: StylePost[] = [
  {
    id: 'post-1',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=60',
    author: 'fashionshine',
    caption: '오늘의 아웃핏! 시크한 블랙과 편안한 핏으로 매칭해봤어요.',
    likes: 120,
  },
  {
    id: 'post-2',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60',
    author: 'daily_look',
    caption: '주말 쇼핑 데이 🛍️ 다담장에서 추천받은 아이템 정말 마음에 드네요.',
    likes: 85,
  },
  {
    id: 'post-3',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=60',
    author: 'style_master',
    caption: '여름 바이브 가득한 리넨 원피스 코디 ✨',
    likes: 240,
  },
];

export const getStylePosts = async (): Promise<StylePost[]> => {
  return Promise.resolve(mockPosts);
};
