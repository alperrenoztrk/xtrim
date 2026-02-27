import { supabase } from '@/integrations/supabase/client';
import { SubscriptionService } from '@/services/SubscriptionService';

export type VideoAITool = 'autocut' | 'enhance' | 'stabilize' | 'denoise' | 'upscale' | 'watermark-remove';
export type ImageGenerationType = 'text-to-image' | 'expand' | 'avatar' | 'poster';

export interface AIToolResult {
  success: boolean;
  tool?: string;
  type?: string;
  outputUrl?: string;
  imageUrl?: string;
  analysis?: string;
  message?: string;
  error?: string;
}

export class AIToolsService {
  // Video/Image enhancement tools
  static async processVideoTool(
    tool: VideoAITool,
    imageBase64?: string,
    options?: { style?: string; strength?: number }
  ): Promise<AIToolResult> {
    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('Your AI usage quota has been reached. Please upgrade your plan or wait until tomorrow.');
      }

      const { data, error } = await supabase.functions.invoke('ai-video-tools', {
        body: { tool, imageBase64, options }
      });

      if (error) {
        throw new Error(error.message || 'AI operation failed');
      }

      return data as AIToolResult;
    } catch (error) {
      console.error('AI tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }

  // Image generation tools
  static async generateImage(
    type: ImageGenerationType,
    prompt: string,
    inputImage?: string,
    options?: { style?: string; aspectRatio?: string }
  ): Promise<AIToolResult> {
    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('Your AI usage quota has been reached. Please upgrade your plan or wait until tomorrow.');
      }

      const { data, error } = await supabase.functions.invoke('ai-image-generate', {
        body: { type, prompt, inputImage, options }
      });

      if (error) {
        throw new Error(error.message || 'Image generation failed');
      }

      return data as AIToolResult;
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }

  // Remove background (uses existing function)
  static async removeBackground(imageBase64: string): Promise<AIToolResult> {
    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('Your AI usage quota has been reached. Please upgrade your plan or wait until tomorrow.');
      }

      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { imageBase64 }
      });

      if (error) {
        throw new Error(error.message || 'Background removal failed');
      }

      return {
        success: data?.success || false,
        imageUrl: data?.imageUrl,
        error: data?.error
      };
    } catch (error) {
      console.error('Background removal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }

  // AutoCut - Analyze video for optimal cut points
  static async analyzeForAutoCut(frameBase64: string): Promise<{
    success: boolean;
    cutPoints?: number[];
    analysis?: string;
    error?: string;
  }> {
    try {
      const result = await this.processVideoTool('autocut', frameBase64);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Parse analysis for cut point suggestions
      let cutPoints: number[] = [];
      if (result.analysis) {
        // Try to extract timestamps from the analysis
        const timestampRegex = /(\d+(?:\.\d+)?)\s*(?:s|seconds?)/gi;
        const matches = result.analysis.matchAll(timestampRegex);
        for (const match of matches) {
          cutPoints.push(parseFloat(match[1]));
        }
      }

      return {
        success: true,
        cutPoints,
        analysis: result.analysis
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AutoCut analysis failed'
      };
    }
  }

  // Helper to convert canvas to base64
  static canvasToBase64(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }

  // Helper to convert video frame to base64
  static async captureVideoFrame(video: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }
    return canvas.toDataURL('image/png');
  }
}
