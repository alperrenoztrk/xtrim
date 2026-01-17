import type { Tool } from '@/types';

export const tools: Tool[] = [
  {
    id: 'new-project',
    name: 'New Project',
    icon: 'Plus',
    description: 'Start a new video project',
    route: '/editor/new',
    gradient: 'from-primary to-accent',
  },
  {
    id: 'templates',
    name: 'Templates',
    icon: 'LayoutGrid',
    description: 'Ready-made video templates',
    route: '/templates',
  },
  {
    id: 'ai-enhance',
    name: 'AI Enhance',
    icon: 'Sparkles',
    description: 'AI-powered enhancements',
    route: '/ai',
    isBeta: true,
    flow: {
      emptyStateTitle: 'No media analyzed yet',
      emptyStateDescription: 'Add a clip or photo to preview AI suggestions.',
      ctaLabel: 'Analyze with AI',
      ctaHint: 'Auto-balance color, sharpen details, and reduce noise.',
      exampleLabel: 'Example prompt',
      exampleInput: '“Boost clarity and add a cinematic teal tone.”',
      exampleHint: 'Tip: Mention mood, lighting, and focus.',
    },
  },
  {
    id: 'video-editor',
    name: 'Video Editor',
    icon: 'Video',
    description: 'Full timeline editing',
    route: '/editor',
  },
  {
    id: 'audio-music',
    name: 'Audio & Music',
    icon: 'Music',
    description: 'Add and edit audio',
    route: '/audio',
    flow: {
      emptyStateTitle: 'No audio tracks yet',
      emptyStateDescription: 'Import music, narration, or ambient sound.',
      ctaLabel: 'Add audio',
      ctaHint: 'Trim, fade, and sync tracks to your timeline.',
      exampleLabel: 'Example track setup',
      exampleInput: 'Harbor Ambience · 0:30 loop · -12 dB',
      exampleHint: 'Tip: Keep narration 6–8 dB above music.',
    },
  },
  {
    id: 'photo-editor',
    name: 'Photo Editor',
    icon: 'Image',
    description: 'Edit and enhance photos',
    route: '/photo-editor',
    flow: {
      emptyStateTitle: 'No photo selected',
      emptyStateDescription: 'Choose a still image to retouch or color grade.',
      ctaLabel: 'Open a photo',
      ctaHint: 'Adjust exposure, contrast, and highlights.',
      exampleLabel: 'Example adjustments',
      exampleInput: 'Exposure +0.3 · Contrast +12 · Highlights -10',
      exampleHint: 'Tip: Small tweaks keep skin tones natural.',
    },
  },
  {
    id: 'collage',
    name: 'Collage',
    icon: 'Grid3X3',
    description: 'Create photo collages',
    route: '/collage',
    flow: {
      emptyStateTitle: 'No layout chosen',
      emptyStateDescription: 'Pick a grid and drop images into each slot.',
      ctaLabel: 'Choose a layout',
      ctaHint: 'Start with 2x2 or 3x1 for quick stories.',
      exampleLabel: 'Example layout',
      exampleInput: '3x3 grid · 9 photos · 4 px spacing',
      exampleHint: 'Tip: Keep horizon lines aligned across cells.',
    },
  },
  {
    id: 'photo-audio',
    name: 'Photo + Audio',
    icon: 'ImagePlay',
    description: 'Create video from photos',
    route: '/photo-audio',
    flow: {
      emptyStateTitle: 'No photo sequence yet',
      emptyStateDescription: 'Add a set of photos to build a slideshow.',
      ctaLabel: 'Add photo set',
      ctaHint: 'Set per-photo durations and transitions.',
      exampleLabel: 'Example sequence',
      exampleInput: '6 photos · 2.5s each · Crossfade',
      exampleHint: 'Tip: Use beat markers to sync transitions.',
    },
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'Settings',
    description: 'App preferences',
    route: '/settings',
  },
];

export const toolsById = tools.reduce<Record<Tool['id'], Tool>>((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {} as Record<Tool['id'], Tool>);
