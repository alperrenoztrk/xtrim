import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Crown, Zap, Star, Gem, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SubscriptionService, PLANS, type SubscriptionPlan } from '@/services/SubscriptionService';

const planIcons: Record<SubscriptionPlan, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  pro: <Star className="w-6 h-6" />,
  premium: <Crown className="w-6 h-6" />,
  ultra: <Gem className="w-6 h-6" />,
};

const planGradients: Record<SubscriptionPlan, string> = {
  free: 'from-muted to-secondary',
  pro: 'from-primary/80 to-primary',
  premium: 'from-accent/80 to-accent',
  ultra: 'from-primary via-accent to-primary',
};

const SubscriptionScreen = () => {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(0);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { plan } = await SubscriptionService.getCurrentPlan();
      setCurrentPlan(plan);
      const used = await SubscriptionService.getAiUsageToday();
      setAiUsed(used);

      if (SubscriptionService.isNativeBillingSupported()) {
        try {
          const products = await SubscriptionService.fetchStoreProducts();
          const prices = Object.fromEntries(products.map((product) => [product.productId, product.price ?? '']));
          setStorePrices(prices);
        } catch (error) {
          console.error('Google Play ürünleri yüklenemedi:', error);
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleSubscribe = async (planId: SubscriptionPlan) => {
    if (planId === 'free' || planId === currentPlan) return;

    setPurchasing(planId);

    if (!SubscriptionService.isNativeBillingSupported()) {
      toast.info('Satın alma işlemleri yalnızca Android uygulaması içinde yapılabilir.');
      setPurchasing(null);
      return;
    }

    try {
      await SubscriptionService.purchasePlan(planId);
      setCurrentPlan(planId);
      toast.success(`${SubscriptionService.getPlanDetails(planId).name} planınız aktif edildi.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Satın alma sırasında bir hata oluştu.';
      toast.error(message);
    }

    setPurchasing(null);
  };

  const handleRestorePurchases = async () => {
    if (!SubscriptionService.isNativeBillingSupported()) {
      toast.info('Abonelik geri yükleme yalnızca Android uygulamasında desteklenir.');
      return;
    }

    setRestoring(true);
    try {
      const { restoredPlan } = await SubscriptionService.restoreNativePurchases();
      if (!restoredPlan) {
        toast.info('Geri yüklenecek aktif bir Google Play aboneliği bulunamadı.');
      } else {
        setCurrentPlan(restoredPlan);
        toast.success(`${SubscriptionService.getPlanDetails(restoredPlan).name} planı geri yüklendi.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Abonelik geri yüklenemedi.';
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  const currentPlanDetails = PLANS.find(p => p.id === currentPlan)!;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Abonelik Planları</h1>
      </header>

      <div className="p-4 space-y-4 pb-20">
        {/* Current Plan Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-5 bg-gradient-to-r ${planGradients[currentPlan]} relative overflow-hidden`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              {planIcons[currentPlan]}
              <span className="text-sm font-medium text-foreground/80">Mevcut Plan</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{currentPlanDetails.name}</h2>
            <p className="text-sm text-foreground/70 mt-1">
              AI Kullanım: {currentPlanDetails.aiTasksPerDay === -1 ? '∞' : `${aiUsed}/${currentPlanDetails.aiTasksPerDay}`} bugün
            </p>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="space-y-3">
          {PLANS.map((plan, index) => {
            const isCurrent = plan.id === currentPlan;
            const isPopular = plan.id === 'premium';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : isPopular
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-card'
                }`}
              >
                {isPopular && (
                  <div className="bg-gradient-to-r from-accent to-primary px-4 py-1.5 text-center">
                    <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                      En Popüler
                    </span>
                  </div>
                )}

                <div className="p-5">
                  {/* Plan Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${planGradients[plan.id]} flex items-center justify-center`}>
                        {planIcons[plan.id]}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                        <p className="text-sm font-semibold text-primary">
                          {storePrices[plan.googlePlayProductId] || plan.price}
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-medium bg-primary/20 text-primary px-3 py-1 rounded-full">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.id !== 'free' && (
                    <Button
                      className={`w-full h-12 font-semibold ${
                        isCurrent
                          ? 'bg-secondary text-muted-foreground'
                          : isPopular
                          ? 'bg-gradient-to-r from-accent to-primary text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                      disabled={isCurrent || purchasing !== null}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {purchasing === plan.id
                        ? 'İşleniyor...'
                        : isCurrent
                        ? 'Mevcut Planınız'
                        : `${plan.name}'a Yükselt`}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info */}
        <p className="text-xs text-center text-muted-foreground px-4 leading-relaxed">
          Abonelikler Google Play üzerinden yönetilir. İstediğiniz zaman iptal edebilirsiniz.
          Ödeme Google Play hesabınızdan tahsil edilir.
        </p>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleRestorePurchases}
          disabled={restoring}
        >
          {restoring ? 'Geri yükleniyor...' : 'Satın alımları geri yükle'}
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionScreen;
