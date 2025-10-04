import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  iconClassName?: string;
};

const Logo = ({ className, iconClassName }: LogoProps) => {
  return (
    <div className={cn('flex items-center gap-2 text-primary', className)}>
      <BrainCircuit className={cn('h-8 w-8', iconClassName)} />
      <span className="text-xl font-bold font-headline tracking-tighter">Quimo</span>
    </div>
  );
};

export default Logo;
