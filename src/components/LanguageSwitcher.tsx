
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Language, languages } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t.common.language}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(languages).map(([langKey, langInfo]) => (
          <DropdownMenuItem
            key={langKey}
            className={`flex items-center justify-between ${langKey === language ? 'bg-accent/50' : ''}`}
            onClick={() => handleLanguageChange(langKey as Language)}
          >
            {langInfo.nativeName}
            {langKey === language && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
