import type { Template } from '@/types';

// Pre-built template definitions
export const templates: Template[] = [
  {
    id: 'travel-vlog',
    name: 'Travel Vlog',
    category: 'Lifestyle',
    thumbnail: '/templates/travel-vlog.jpg',
    duration: 30,
    aspectRatio: '16:9',
    description: 'Cinematic travel montage with smooth transitions',
    mediaSlots: 6,
    isPremium: false,
    config: {
      clips: [
        { duration: 4, effect: 'fade-in', transition: 'zoom' },
        { duration: 5, effect: 'pan', transition: 'slide' },
        { duration: 5, effect: 'tilt', transition: 'dissolve' },
        { duration: 5, effect: 'zoom-slow', transition: 'wipe' },
        { duration: 5, effect: 'parallax', transition: 'slide' },
        { duration: 6, effect: 'fade-out', transition: 'fade' },
      ],
      transitions: ['zoom', 'slide', 'dissolve', 'wipe', 'fade'],
      music: 'upbeat-travel',
      textOverlays: [
        { text: 'Adventure Awaits', position: 'center', style: 'bold', startTime: 0, duration: 3 },
      ],
    },
  },
  {
    id: 'workout',
    name: 'Workout',
    category: 'Fitness',
    thumbnail: '/templates/workout.jpg',
    duration: 20,
    aspectRatio: '9:16',
    description: 'High-energy fitness video with beat sync',
    mediaSlots: 8,
    isPremium: false,
    config: {
      clips: [
        { duration: 2, effect: 'flash', transition: 'cut' },
        { duration: 2.5, effect: 'shake', transition: 'cut' },
        { duration: 2.5, effect: 'zoom-fast', transition: 'cut' },
        { duration: 2.5, effect: 'flash', transition: 'cut' },
        { duration: 2.5, effect: 'shake', transition: 'cut' },
        { duration: 2.5, effect: 'zoom-fast', transition: 'cut' },
        { duration: 2.5, effect: 'flash', transition: 'cut' },
        { duration: 3, effect: 'fade-out', transition: 'fade' },
      ],
      transitions: ['cut', 'flash'],
      music: 'energetic-beat',
    },
  },
  {
    id: 'before-after',
    name: 'Before/After',
    category: 'Transformation',
    thumbnail: '/templates/before-after.jpg',
    duration: 15,
    aspectRatio: '9:16',
    description: 'Dramatic transformation reveal',
    mediaSlots: 2,
    isPremium: false,
    config: {
      clips: [
        { duration: 7, effect: 'slow-zoom', transition: 'wipe-horizontal' },
        { duration: 8, effect: 'reveal', transition: 'fade' },
      ],
      transitions: ['wipe-horizontal', 'fade'],
      music: 'dramatic-reveal',
      textOverlays: [
        { text: 'Before', position: 'bottom', style: 'light', startTime: 1, duration: 5 },
        { text: 'After', position: 'bottom', style: 'accent', startTime: 8, duration: 5 },
      ],
    },
  },
  {
    id: 'lyric-beat',
    name: 'Lyric Beat',
    category: 'Music',
    thumbnail: '/templates/lyric-beat.jpg',
    duration: 25,
    aspectRatio: '9:16',
    description: 'Beat-synced video with lyric overlays',
    mediaSlots: 5,
    isPremium: true,
    config: {
      clips: [
        { duration: 5, effect: 'beat-sync', transition: 'cut' },
        { duration: 5, effect: 'beat-sync', transition: 'cut' },
        { duration: 5, effect: 'beat-sync', transition: 'cut' },
        { duration: 5, effect: 'beat-sync', transition: 'cut' },
        { duration: 5, effect: 'beat-sync', transition: 'fade' },
      ],
      transitions: ['cut', 'fade'],
      music: 'custom',
    },
  },
  {
    id: 'minimal-promo',
    name: 'Minimal Promo',
    category: 'Business',
    thumbnail: '/templates/minimal-promo.jpg',
    duration: 20,
    aspectRatio: '16:9',
    description: 'Clean, professional product showcase',
    mediaSlots: 4,
    isPremium: false,
    config: {
      clips: [
        { duration: 5, effect: 'fade-in', transition: 'dissolve' },
        { duration: 5, effect: 'pan-slow', transition: 'dissolve' },
        { duration: 5, effect: 'zoom-subtle', transition: 'dissolve' },
        { duration: 5, effect: 'fade-out', transition: 'fade' },
      ],
      transitions: ['dissolve', 'fade'],
      music: 'ambient-corporate',
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'Film',
    thumbnail: '/templates/cinematic.jpg',
    duration: 45,
    aspectRatio: '16:9',
    description: 'Movie-style trailer with letterboxing',
    mediaSlots: 8,
    isPremium: true,
    config: {
      clips: [
        { duration: 4, effect: 'letterbox-in', transition: 'fade' },
        { duration: 6, effect: 'slow-motion', transition: 'dissolve' },
        { duration: 6, effect: 'pan-cinematic', transition: 'dissolve' },
        { duration: 5, effect: 'zoom-dramatic', transition: 'cut' },
        { duration: 5, effect: 'tilt-reveal', transition: 'cut' },
        { duration: 6, effect: 'slow-motion', transition: 'dissolve' },
        { duration: 7, effect: 'epic-zoom', transition: 'dissolve' },
        { duration: 6, effect: 'letterbox-out', transition: 'fade' },
      ],
      transitions: ['fade', 'dissolve', 'cut'],
      music: 'epic-trailer',
    },
  },
  {
    id: 'tiktok-story',
    name: 'TikTok Story',
    category: 'Social',
    thumbnail: '/templates/tiktok-story.jpg',
    duration: 15,
    aspectRatio: '9:16',
    description: 'Trendy TikTok-style quick cuts',
    mediaSlots: 6,
    isPremium: false,
    config: {
      clips: [
        { duration: 2, effect: 'glitch', transition: 'cut' },
        { duration: 2.5, effect: 'zoom-bounce', transition: 'cut' },
        { duration: 2.5, effect: 'shake-light', transition: 'cut' },
        { duration: 2.5, effect: 'flash', transition: 'cut' },
        { duration: 2.5, effect: 'spin', transition: 'cut' },
        { duration: 3, effect: 'zoom-out', transition: 'fade' },
      ],
      transitions: ['cut', 'fade'],
      music: 'trending-sound',
    },
  },
  {
    id: 'photo-montage',
    name: 'Photo Montage',
    category: 'Memories',
    thumbnail: '/templates/photo-montage.jpg',
    duration: 30,
    aspectRatio: '16:9',
    description: 'Beautiful photo slideshow with Ken Burns',
    mediaSlots: 10,
    isPremium: false,
    config: {
      clips: [
        { duration: 3, effect: 'ken-burns-1', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-2', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-3', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-4', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-1', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-2', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-3', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-4', transition: 'dissolve' },
        { duration: 3, effect: 'ken-burns-1', transition: 'dissolve' },
        { duration: 3, effect: 'fade-out', transition: 'fade' },
      ],
      transitions: ['dissolve', 'fade'],
      music: 'emotional-piano',
    },
  },
];

export class TemplateService {
  static getTemplates(): Template[] {
    return templates;
  }

  static getTemplateById(id: string): Template | null {
    return templates.find((t) => t.id === id) || null;
  }

  static getTemplatesByCategory(category: string): Template[] {
    return templates.filter((t) => t.category === category);
  }

  static getCategories(): string[] {
    return [...new Set(templates.map((t) => t.category))];
  }

  static searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }
}
