import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Crown, Check, Sparkles, Infinity as InfinityIcon, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useUserStore } from '@/stores/useUserStore';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/subscription';

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore();
  const {
    plans,
    currentSubscription,
    isLoading,
    isRedirecting,
    fetchPlans,
    fetchCurrentSubscription,
    startCheckout,
    openCustomerPortal,
  } = useSubscriptionStore();

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchPlans();
    if (isAuthenticated) fetchCurrentSubscription();
  }, [fetchPlans, fetchCurrentSubscription, isAuthenticated]);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success !== 'true' && canceled !== 'true') return;

    const frame = requestAnimationFrame(() => {
      if (success === 'true') {
        setStatusMessage({ type: 'success', text: 'Payment successful! Your plan has been upgraded.' });
      } else {
        setStatusMessage({ type: 'info', text: 'Payment was canceled. You can try again anytime.' });
      }
    });
    if (success === 'true' && isAuthenticated) fetchCurrentSubscription();
    window.history.replaceState({}, '', '/subscription');
    return () => cancelAnimationFrame(frame);
  }, [searchParams, isAuthenticated, fetchCurrentSubscription]);

  const handleCheckout = (priceId: string) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/subscription`);
      return;
    }
    startCheckout(priceId).catch(() => {
      setStatusMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
    });
  };

  const handleManageSubscription = () => openCustomerPortal();

  const currentTier = currentSubscription?.tier || 'free';

  return (
    <div className="min-h-screen kit-page-bg">
      {/* Header */}
      <header className="border-b border-[hsl(var(--sidebar-border)/0.6)]">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider kit-muted hover:kit-strong transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to iDrip
          </Link>
          <p className="kit-overline">Pricing</p>
          <h1 className="kit-display text-4xl md:text-5xl mt-2">
            Choose your plan
            <span className="kit-display ml-1 text-[hsl(var(--sidebar-accent))]">.</span>
          </h1>
          <p className="mt-3 text-sm kit-muted max-w-md leading-relaxed">
            Unlock the full power of AI-powered styling. Upgrade anytime, cancel anytime.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {statusMessage && (
          <div
            className={cn(
              'p-4 rounded-xl text-sm font-medium border',
              statusMessage.type === 'success' &&
                'border-[hsl(var(--sidebar-accent)/0.4)] bg-[hsl(var(--sidebar-accent)/0.1)] text-[hsl(var(--sidebar-fg))]',
              statusMessage.type === 'info' &&
                'border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-hover))] kit-strong',
              statusMessage.type === 'error' &&
                'border-[hsl(var(--sidebar-danger)/0.4)] bg-[hsl(var(--sidebar-danger)/0.08)] text-[hsl(var(--sidebar-danger))]'
            )}
          >
            {statusMessage.text}
          </div>
        )}

        {isAuthenticated && currentTier !== 'free' && (
          <div className="kit-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="kit-icon-box kit-icon-box-accent flex-shrink-0">
                  <Crown className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="kit-overline">Current</p>
                  <p className="font-display text-base font-semibold capitalize kit-strong">
                    You're on the {currentTier} plan
                  </p>
                  {currentSubscription?.status && currentSubscription.status !== 'active' && (
                    <p className="text-xs kit-muted">Status: {currentSubscription.status}</p>
                  )}
                </div>
              </div>
              <button onClick={handleManageSubscription} className="kit-btn-secondary">
                Manage Subscription
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 kit-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentTier={currentTier}
                isAuthenticated={isAuthenticated}
                isRedirecting={isRedirecting}
                onSelect={handleCheckout}
                onManage={handleManageSubscription}
              />
            ))}
          </div>
        )}

        <section>
          <p className="kit-overline">Compare</p>
          <h2 className="kit-display text-2xl md:text-3xl mt-1.5 mb-6">Feature Comparison</h2>
          <div className="kit-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--sidebar-border)/0.6)]">
                    <th className="text-left px-6 py-4 kit-overline">Feature</th>
                    <th className="px-6 py-4 kit-overline text-center">Free</th>
                    <th className="px-6 py-4 kit-overline text-center text-[hsl(var(--sidebar-accent))]">
                      Pro
                    </th>
                    <th className="px-6 py-4 kit-overline text-center">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Wardrobe items" free="20" pro="Unlimited" lifetime="Unlimited" />
                  <ComparisonRow label="AI outfit generations" free="5 / month" pro="Unlimited" lifetime="Unlimited" />
                  <ComparisonRow label="Shopping recommendations" free="Basic" pro="Advanced" lifetime="Advanced" />
                  <ComparisonRow
                    label="Priority AI processing"
                    free="—"
                    pro={<Check className="w-4 h-4 mx-auto text-[hsl(var(--sidebar-accent))]" />}
                    lifetime={<Check className="w-4 h-4 mx-auto text-[hsl(var(--sidebar-accent))]" />}
                  />
                  <ComparisonRow
                    label="Premium support"
                    free="—"
                    pro="—"
                    lifetime={<Check className="w-4 h-4 mx-auto text-[hsl(var(--sidebar-accent))]" />}
                  />
                  <ComparisonRow
                    label="Future premium features"
                    free="—"
                    pro={<Check className="w-4 h-4 mx-auto text-[hsl(var(--sidebar-accent))]" />}
                    lifetime={<Check className="w-4 h-4 mx-auto text-[hsl(var(--sidebar-accent))]" />}
                    isLast
                  />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <FaqSection />
      </div>
    </div>
  );
}

const FAQS = [
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes! You can upgrade or switch between Pro Monthly and Pro Yearly anytime via the Stripe Customer Portal. Your billing will be prorated.',
  },
  {
    question: 'What happens when my subscription ends?',
    answer:
      "If you cancel Pro, you'll revert to the Free plan at the end of your billing period. Your wardrobe data is preserved — you just won't be able to add new items beyond 20.",
  },
  {
    question: 'Is the Lifetime plan really forever?',
    answer:
      'Yes! One payment of $199 gives you lifetime access to all current and future premium features. No recurring charges, ever.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      "Pro subscriptions can be canceled anytime and you'll keep access until the end of the billing period. Lifetime purchases have a 30-day money-back guarantee.",
  },
] as const;

function FaqSection() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const frame = requestAnimationFrame(() => setStarted(true));
      return () => cancelAnimationFrame(frame);
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  return (
    <section ref={ref} className="pb-12">
      <p className="kit-overline">Questions</p>
      <h2 className="kit-display text-2xl md:text-3xl mt-1.5 mb-6">FAQ</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FAQS.map((faq) => (
          <FaqCard
            key={faq.question}
            question={faq.question}
            answer={faq.answer}
            start={started}
          />
        ))}
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  currentTier,
  isAuthenticated,
  isRedirecting,
  onSelect,
  onManage,
}: {
  plan: Plan;
  currentTier: string;
  isAuthenticated: boolean;
  isRedirecting: boolean;
  onSelect: (priceId: string) => void;
  onManage: () => void;
}) {
  const isCurrentPlan =
    plan.id === currentTier ||
    (plan.id === 'pro_monthly' && currentTier === 'pro') ||
    (plan.id === 'pro_yearly' && currentTier === 'pro');

  const isFree = plan.id === 'free';
  const isLifetime = plan.id === 'lifetime';
  const isProYearly = plan.id === 'pro_yearly';

  const savingsPercent = isProYearly ? Math.round((1 - 89.99 / (9.99 * 12)) * 100) : 0;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl p-6 transition-all duration-200',
        plan.highlighted
          ? 'bg-[hsl(var(--sidebar-hover))]'
          : 'bg-[hsl(var(--sidebar-hover))]'
      )}
      style={{
        boxShadow: plan.highlighted
          ? '0 0 0 2px hsl(var(--sidebar-accent)), 0 24px 56px -16px hsl(var(--sidebar-accent) / 0.25)'
          : undefined,
      }}
    >
      {plan.highlighted && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
          style={{
            background: 'hsl(var(--sidebar-accent))',
            color: '#000',
          }}
        >
          <Sparkles className="w-3 h-3" /> Recommended
        </div>
      )}

      <div className="flex-1 space-y-5">
        <div className="flex items-center gap-2">
          {isFree && <Zap className="w-5 h-5 kit-muted" />}
          {!isFree && !isLifetime && <Crown className="w-5 h-5 text-[hsl(var(--sidebar-accent))]" />}
          {isLifetime && <InfinityIcon className="w-5 h-5 text-[hsl(var(--sidebar-accent))]" />}
          <h3 className="font-display text-lg font-bold kit-strong">{plan.name}</h3>
        </div>

        <div>
          {plan.price === 0 ? (
            <div className="kit-display text-4xl">Free</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-sans kit-display text-4xl">
                ${plan.price.toFixed(plan.price % 1 === 0 ? 0 : 2)}
              </span>
              {plan.interval && (
                <span className="text-sm kit-muted">/{plan.interval}</span>
              )}
            </div>
          )}
          {isProYearly && (
            <p className="text-xs text-[hsl(var(--sidebar-accent))] mt-1 font-semibold">
              Save {savingsPercent}% vs monthly
            </p>
          )}
          {isLifetime && (
            <p className="text-xs kit-muted mt-1">One-time payment</p>
          )}
        </div>

        <ul className="space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm kit-muted">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--sidebar-accent))]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        {isCurrentPlan && isAuthenticated ? (
          isFree ? (
            <p className="w-full py-2.5 text-center rounded-xl text-xs font-semibold uppercase tracking-wider kit-muted border border-[hsl(var(--sidebar-border))]">
              Current Plan
            </p>
          ) : (
            <button onClick={onManage} className="kit-btn-secondary w-full justify-center">
              Manage Subscription
            </button>
          )
        ) : isFree ? (
          <p className="w-full py-2.5 text-center rounded-xl text-xs font-semibold uppercase tracking-wider kit-muted border border-[hsl(var(--sidebar-border))]">
            Included with sign up
          </p>
        ) : plan.highlighted ? (
          <button
            onClick={() => onSelect(plan.stripePriceId!)}
            disabled={isRedirecting}
            className={cn(
              'kit-btn-primary w-full justify-center',
              isRedirecting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRedirecting ? 'Redirecting...' : isLifetime ? 'Get Lifetime Access' : 'Upgrade'}
            {!isRedirecting && <ArrowRight className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={() => onSelect(plan.stripePriceId!)}
            disabled={isRedirecting}
            className={cn(
              'kit-btn-secondary w-full justify-center',
              isRedirecting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRedirecting ? 'Redirecting...' : isLifetime ? 'Get Lifetime Access' : 'Upgrade'}
            {!isRedirecting && <ArrowRight className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  free,
  pro,
  lifetime,
  isLast,
}: {
  label: string;
  free: React.ReactNode;
  pro: React.ReactNode;
  lifetime: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <tr className={cn(!isLast && 'border-b border-[hsl(var(--sidebar-border)/0.4)]')}>
      <td className="px-6 py-3.5 kit-muted">{label}</td>
      <td className="px-6 py-3.5 text-center kit-strong">{free}</td>
      <td className="px-6 py-3.5 text-center kit-strong bg-[hsl(var(--sidebar-accent)/0.08)]">
        {pro}
      </td>
      <td className="px-6 py-3.5 text-center kit-strong">{lifetime}</td>
    </tr>
  );
}

function FaqCard({
  question,
  answer,
  start,
}: {
  question: string;
  answer: string;
  start: boolean;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (shown >= answer.length) return;
    const id = window.setInterval(() => {
      setShown((s) => {
        if (s >= answer.length) {
          window.clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 15);
    return () => window.clearInterval(id);
  }, [start, answer.length, shown]);

  const done = shown >= answer.length;

  return (
    <div className="kit-card p-5">
      <h3 className="font-display text-base font-semibold kit-strong mb-2">{question}</h3>
      <div className="relative text-sm leading-relaxed">
        <p aria-hidden="true" className="invisible whitespace-pre-wrap">
          {answer}
        </p>
        <p className="absolute inset-0 kit-muted whitespace-pre-wrap">
          {answer.slice(0, shown)}
          {!done && (
            <span className="ml-0.5 inline-block w-[2px] h-[1em] align-[-2px] bg-[hsl(var(--sidebar-accent))] animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}
