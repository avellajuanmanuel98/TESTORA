import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionDefinition } from "@/features/test-cases/types";

interface StepParamsFormProps {
  action: ActionDefinition;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function StepParamsForm({ action, values, onChange }: StepParamsFormProps) {
  if (action.params.length === 0) {
    return <p className="text-[13px] text-fg-muted">Esta acción no tiene parámetros.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {action.params.map((param) => {
        const isWide = param.type === "selector" || param.type === "url";
        const value = values[param.key] ?? "";

        if (param.type === "select") {
          return (
            <div key={param.key} className={isWide ? "col-span-2" : ""}>
              <Select
                label={param.label}
                required={param.required}
                value={value}
                onChange={(e) => onChange(param.key, e.target.value)}
              >
                <option value="" disabled>
                  Seleccionar…
                </option>
                {param.choices.map(([choiceValue, choiceLabel]) => (
                  <option key={choiceValue} value={choiceValue}>
                    {choiceLabel}
                  </option>
                ))}
              </Select>
            </div>
          );
        }

        return (
          <div key={param.key} className={isWide ? "col-span-2" : ""}>
            <Input
              label={param.label}
              required={param.required}
              type={param.type === "number" ? "number" : "text"}
              mono={param.type === "selector" || param.type === "url"}
              placeholder={param.placeholder}
              hint={param.help_text || undefined}
              value={value}
              onChange={(e) => onChange(param.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
