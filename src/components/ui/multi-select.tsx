
import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (item: string) => {
    onChange(value.filter((i) => i !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "") {
          const newValue = [...value];
          newValue.pop();
          onChange(newValue);
        }
      }
      if (e.key === "Escape") {
        input.blur();
      }
    }
  };

  const selectables = options.filter((option) => !value.includes(option.value));

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn(
        "overflow-visible border border-input rounded-md focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 p-1 group">
        {value.map((item) => {
          const option = options.find((option) => option.value === item);
          return (
            <Badge
              key={item}
              variant="secondary"
              className="rounded-sm px-1 font-normal data-[disabled]:bg-muted-foreground data-[disabled]:text-muted data-[disabled]:hover:bg-muted-foreground data-[disabled]:opacity-60"
            >
              {option?.label || item}
              <button
                className="ml-1 rounded-sm outline-none"
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option?.label || item}</span>
              </button>
            </Badge>
          );
        })}
        <CommandPrimitive.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onBlur={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px] h-full"
        />
      </div>
      <div>
        {open && selectables.length > 0 && (
          <CommandGroup className="absolute z-50 w-full top-full rounded-md border border-t-0 bg-popover text-popover-foreground shadow-md">
            {selectables.map((option) => {
              return (
                <CommandItem
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => {
                    onChange([...value, option.value]);
                    setInputValue("");
                  }}
                  disabled={option.disable}
                  className="cursor-pointer"
                >
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </div>
    </Command>
  );
}
