import { Info } from "lucide-react";

interface InfoCardProps {
  content: string;
  icon?: string;
}

export default function InfoCard({ content }: InfoCardProps) {
  return (
    <div className="card flex items-start gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
        <Info className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-foreground/90 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}