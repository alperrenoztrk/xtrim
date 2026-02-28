import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { PlayBilling, type BillingProduct, type BillingPurchase } from '@/plugins/PlayBillingPlugin';

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
    price: 'Free',
    priceMonthly: 0,
    googlePlayProductId: '',
    features: [
      'Basic video editing',
      '2 AI tasks per day',
      '720p export',
      'Export with watermark',
    ],
    aiTasksPerDay: 2,
    maxResolution: '720p',
    hasWatermark: true,
    hasDubbing: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₺149.99/month',
    priceMonthly: 149.99,
    googlePlayProductId: 'xtrim_pro_monthly',
    features: [
      'All editing tools',
      '15 AI tasks per day',
      '1080p Full HD export',
      'No watermark',
      'Priority support',
    ],
    aiTasksPerDay: 15,
    maxResolution: '1080p',
    hasWatermark: false,
    hasDubbing: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₺299.99/month',
    priceMonthly: 299.99,
    googlePlayProductId: 'xtrim_premium_monthly',
    features: [
      'Unlimited AI tasks',
      '4K Ultra HD export',
      'AI Video Translation (subtitles)',
      'Advanced AI tools',
      'Priority support',
      'Early access features',
    ],
    aiTasksPerDay: -1, // unlimited
    maxResolution: '4k',
    hasWatermark: false,
    hasDubbing: false,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '₺599.99/month',
    priceMonthly: 599.99,
    googlePlayProductId: 'xtrim_ultra_monthly',
    features: [
      'Everything in Premium',
      'AI Voice Dubbing',
      'Unlimited 4K export',
      'Professional color correction',
      'Batch export',
      'VIP support',
    ],
    aiTasksPerDay: -1,
    maxResolution: '4k',
    hasWatermark: false,
    hasDubbing: true,
  },
];

export class SubscriptionService {
  static getPaidPlans(): PlanDetails[] {
    return PLANS.filter((plan) => plan.id !== 'free');
  }

  static getPlanByProductId(productId: string): SubscriptionPlan | null {
    const plan = PLANS.find((item) => item.googlePlayProductId === productId);
    return plan?.id ?? null;
  }

  static isNativeBillingSupported(): boolean {
    return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
  }

  static async initializeBilling(): Promise<void> {
    if (!this.isNativeBillingSupported()) {
      throw new Error('Google Play Billing is only supported in the native Android environment.');
    }

    const { available } = await PlayBilling.isAvailable();
    if (!available) {
      throw new Error('Google Play Billing is not available on this device.');
    }

    await PlayBilling.initialize();
  }

  static async fetchStoreProducts(): Promise<BillingProduct[]> {
    await this.initializeBilling();
    const productIds = this.getPaidPlans().map((plan) => plan.googlePlayProductId);
    const { products } = await PlayBilling.getProducts({ productIds, type: 'subs' });
    return products;
  }

  static async purchasePlan(plan: SubscriptionPlan): Promise<{ purchase: BillingPurchase; activatedPlan: SubscriptionPlan }> {
    const planDetails = this.getPlanDetails(plan);
    if (planDetails.id === 'free' || !planDetails.googlePlayProductId) {
      throw new Error('This plan cannot be purchased via Google Play.');
    }

    await this.initializeBilling();
    const { purchase } = await PlayBilling.purchaseProduct({
      productId: planDetails.googlePlayProductId,
      type: 'subs',
    });

    if (!purchase) {
      throw new Error('Purchase could not be completed.');
    }

    if (purchase.purchaseState !== 'purchased') {
      throw new Error('Purchase is pending. Your plan will be activated once payment is confirmed.');
    }

    await this.activatePlan(plan, purchase.purchaseToken, purchase.orderId);

    if (!purchase.acknowledged) {
      await PlayBilling.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
    }

    return { purchase, activatedPlan: plan };
  }

  static async restoreNativePurchases(): Promise<{ restoredPlan: SubscriptionPlan | null }> {
    await this.initializeBilling();
    const { purchases } = await PlayBilling.restorePurchases({ type: 'subs' });

    const purchased = purchases.find((item) => item.purchaseState === 'purchased');
    if (!purchased) {
      return { restoredPlan: null };
    }

    const matchedPlan = this.getPlanByProductId(purchased.productId);
    if (!matchedPlan || matchedPlan === 'free') {
      return { restoredPlan: null };
    }

    await this.activatePlan(matchedPlan, purchased.purchaseToken, purchased.orderId);

    if (!purchased.acknowledged) {
      await PlayBilling.acknowledgePurchase({ purchaseToken: purchased.purchaseToken });
    }

    return { restoredPlan: matchedPlan };
  }

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
