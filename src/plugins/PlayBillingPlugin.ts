import { registerPlugin, WebPlugin } from '@capacitor/core';

export type BillingProductType = 'subs' | 'inapp';

export interface BillingProduct {
  productId: string;
  title?: string;
  description?: string;
  price?: string;
  currencyCode?: string;
  rawPrice?: number;
  type?: BillingProductType;
}

export type PurchaseState = 'purchased' | 'pending' | 'unspecified';

export interface BillingPurchase {
  orderId?: string;
  packageName?: string;
  productId: string;
  purchaseToken: string;
  purchaseTime?: number;
  purchaseState: PurchaseState;
  acknowledged?: boolean;
  autoRenewing?: boolean;
}

export interface PlayBillingPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  initialize(): Promise<void>;
  getProducts(options: { productIds: string[]; type?: BillingProductType }): Promise<{ products: BillingProduct[] }>;
  purchaseProduct(options: { productId: string; type?: BillingProductType }): Promise<{ purchase: BillingPurchase | null }>;
  restorePurchases(options?: { type?: BillingProductType }): Promise<{ purchases: BillingPurchase[] }>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<void>;
}

class PlayBillingWeb extends WebPlugin implements PlayBillingPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  }

  async initialize(): Promise<void> {
    throw this.createUnavailableError('Google Play Billing is only available in the native Android environment.');
  }

  async getProducts(): Promise<{ products: BillingProduct[] }> {
    throw this.createUnavailableError('Google Play Billing is only available in the native Android environment.');
  }

  async purchaseProduct(): Promise<{ purchase: BillingPurchase | null }> {
    throw this.createUnavailableError('Google Play Billing is only available in the native Android environment.');
  }

  async restorePurchases(): Promise<{ purchases: BillingPurchase[] }> {
    throw this.createUnavailableError('Google Play Billing is only available in the native Android environment.');
  }

  async acknowledgePurchase(): Promise<void> {
    throw this.createUnavailableError('Google Play Billing is only available in the native Android environment.');
  }

  private createUnavailableError(message: string): Error {
    return new Error(message);
  }
}

export const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling', {
  web: () => new PlayBillingWeb(),
});
