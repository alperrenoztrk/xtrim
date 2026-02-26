import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'free' | 'pro' | 'premium' | 'ultra';

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: string;
  priceMonthly: number;
  googlePlayProductId: string;
  features: string[];
  aiTasksPerDay: number;
  maxResolution: string;
  hasWatermark: boolean;
  hasDubbing: boolean;
}

export const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'Ücretsiz',
    priceMonthly: 0,
    googlePlayProductId: '',
    features: [
      'Temel video düzenleme',
      'Günde 2 AI işlem',
      '720p dışa aktarma',
      'Watermark ile dışa aktarma',
    ],
    aiTasksPerDay: 2,
    maxResolution: '720p',
    hasWatermark: true,
    hasDubbing: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₺149.99/ay',
    priceMonthly: 149.99,
    googlePlayProductId: 'xtrim_pro_monthly',
    features: [
      'Tüm düzenleme araçları',
      'Günde 15 AI işlem',
      '1080p Full HD dışa aktarma',
      'Watermark yok',
      'Öncelikli destek',
    ],
    aiTasksPerDay: 15,
    maxResolution: '1080p',
    hasWatermark: false,
    hasDubbing: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₺299.99/ay',
    priceMonthly: 299.99,
    googlePlayProductId: 'xtrim_premium_monthly',
    features: [
      'Sınırsız AI işlem',
      '4K Ultra HD dışa aktarma',
      'AI Video Çeviri (altyazı)',
      'Gelişmiş AI araçları',
      'Öncelikli destek',
      'Erken erişim özellikler',
    ],
    aiTasksPerDay: -1, // unlimited
    maxResolution: '4k',
    hasWatermark: false,
    hasDubbing: false,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '₺599.99/ay',
    priceMonthly: 599.99,
    googlePlayProductId: 'xtrim_ultra_monthly',
    features: [
      'Premium\'daki her şey',
      'AI Sesli Dublaj',
      'Sınırsız 4K dışa aktarma',
      'Profesyonel renk düzeltme',
      'Toplu dışa aktarma',
      'VIP destek',
    ],
    aiTasksPerDay: -1,
    maxResolution: '4k',
    hasWatermark: false,
    hasDubbing: true,
  },
];

export class SubscriptionService {
  static async getCurrentPlan(): Promise<{ plan: SubscriptionPlan; isActive: boolean; expiresAt: string | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { plan: 'free', isActive: true, expiresAt: null };

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan, is_active, expires_at')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      // Create default subscription if not exists
      await supabase.from('user_subscriptions').insert({
        user_id: session.user.id,
        plan: 'free',
        is_active: true,
      });
      return { plan: 'free', isActive: true, expiresAt: null };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase
        .from('user_subscriptions')
        .update({ plan: 'free', is_active: true, expires_at: null })
        .eq('user_id', session.user.id);
      return { plan: 'free', isActive: true, expiresAt: null };
    }

    return {
      plan: data.plan as SubscriptionPlan,
      isActive: data.is_active,
      expiresAt: data.expires_at,
    };
  }

  static async getAiUsageToday(): Promise<number> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('ai_usage')
      .select('ai_tasks_used')
      .eq('user_id', session.user.id)
      .eq('usage_date', today)
      .single();

    return data?.ai_tasks_used ?? 0;
  }

  static async incrementAiUsage(): Promise<{ allowed: boolean; used: number; limit: number }> {
    const { plan } = await this.getCurrentPlan();
    const planDetails = PLANS.find(p => p.id === plan)!;
    const limit = planDetails.aiTasksPerDay;

    if (limit === -1) return { allowed: true, used: 0, limit: -1 };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { allowed: false, used: 0, limit };

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('ai_usage')
      .select('id, ai_tasks_used')
      .eq('user_id', session.user.id)
      .eq('usage_date', today)
      .single();

    if (existing) {
      if (existing.ai_tasks_used >= limit) {
        return { allowed: false, used: existing.ai_tasks_used, limit };
      }
      await supabase
        .from('ai_usage')
        .update({ ai_tasks_used: existing.ai_tasks_used + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { allowed: true, used: existing.ai_tasks_used + 1, limit };
    }

    await supabase.from('ai_usage').insert({
      user_id: session.user.id,
      usage_date: today,
      ai_tasks_used: 1,
    });
    return { allowed: true, used: 1, limit };
  }

  static async canUseFeature(feature: 'dubbing' | '4k' | 'ai' | 'no_watermark'): Promise<boolean> {
    const { plan } = await this.getCurrentPlan();
    const details = PLANS.find(p => p.id === plan)!;

    switch (feature) {
      case 'dubbing': return details.hasDubbing;
      case '4k': return details.maxResolution === '4k';
      case 'no_watermark': return !details.hasWatermark;
      case 'ai': {
        if (details.aiTasksPerDay === -1) return true;
        const used = await this.getAiUsageToday();
        return used < details.aiTasksPerDay;
      }
      default: return false;
    }
  }

  static getPlanDetails(plan: SubscriptionPlan): PlanDetails {
    return PLANS.find(p => p.id === plan)!;
  }

  // This will be called after Google Play purchase verification
  static async activatePlan(plan: SubscriptionPlan, googlePlayToken?: string, orderId?: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase
      .from('user_subscriptions')
      .update({
        plan,
        is_active: true,
        google_play_token: googlePlayToken ?? null,
        google_play_order_id: orderId ?? null,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id);
  }
}
