
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface CheckboxCardProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const CheckboxCard: React.FC<CheckboxCardProps> = ({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false
}) => {
  return (
    <Card className={`border ${checked ? 'border-primary' : 'border-border'}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="mt-1">
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
              />
            )}
          </div>
        </div>
        <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
};
