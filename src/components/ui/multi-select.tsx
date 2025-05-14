
import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type Option = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  
  const handleUnselect = (item: string) => {
    if (!onChange) return
    onChange(value.filter((i) => i !== item))
  }

  const handleSelect = (item: string) => {
    if (!onChange) return
    if (value.includes(item)) {
      onChange(value.filter((i) => i !== item))
    } else {
      onChange([...value, item])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {options.find((option) => option.value === item)?.label}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => {
              const isSelected = value.includes(option.value)
              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "flex items-center gap-2",
                    isSelected ? "bg-accent" : ""
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted bg-transparent"
                    )}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-sm bg-current" />}
                  </div>
                  {option.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
