import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toolsById } from '@/data/tools';

const AiScreen = () => {
  const navigate = useNavigate();
  const tool = toolsById['ai-enhance'];
  const flow = tool.flow;

  if (!flow) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{tool.name}</h1>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{flow.emptyStateTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {flow.emptyStateDescription}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">CTA</p>
            <p className="text-xs text-muted-foreground mt-1">{flow.ctaHint}</p>
          </div>
          <Button variant="gradient" className="w-full">
            {flow.ctaLabel}
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{flow.exampleLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{flow.exampleHint}</p>
          </div>
          <Input
            value={flow.exampleInput}
            readOnly
            className="bg-secondary border-0 text-xs"
            aria-label="AI prompt example"
          />
        </section>
      </div>
    </div>
  );
};

export default AiScreen;
