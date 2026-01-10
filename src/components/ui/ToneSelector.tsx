import { useTone, ToneType } from '@/contexts/ToneContext';
import { Globe } from 'lucide-react';

const toneLabels: Record<ToneType, string> = {
  'chill-bro-banglish': '😎 Chill Bro',
  'friendly-banglish': '🙂 Friendly',
  'formal-bangla': '📚 Formal বাংলা',
};

const ToneSelector = () => {
  const { tone, setTone } = useTone();

  const tones: ToneType[] = ['chill-bro-banglish', 'friendly-banglish', 'formal-bangla'];

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={tone}
        onChange={(e) => setTone(e.target.value as ToneType)}
        className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all hover:border-primary/50"
      >
        {tones.map((t) => (
          <option key={t} value={t} className="bg-card">
            {toneLabels[t]}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ToneSelector;
