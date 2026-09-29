import { useState } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionDefinition } from "@/features/test-cases/types";

interface StepParamsFormProps {
  action: ActionDefinition;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Variable keys defined on this project's environments, e.g. ["BASE_URL"]
   * — shown as insertable chips so the user doesn't have to remember or go
   * check Environments to find out what's available. */
  variables?: string[];
}

export function StepParamsForm({ action, values, onChange, variables = [] }: StepParamsFormProps) {
  // Tracks which text param last had focus, so a variable chip click knows
  // where to insert {{KEY}} — falls back to the first non-select param.
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  if (action.params.length === 0) {
    return <p className="text-[13px] text-fg-muted">Esta acción no tiene parámetros.</p>;
  }

  const fallbackKey = action.params.find((p) => p.type !== "select")?.key ?? null;
  const targetKey = focusedKey ?? fallbackKey;

  function insertVariable(key: string) {
    if (!targetKey) return;
    onChange(targetKey, `${values[targetKey] ?? ""}{{${key}}}`);
  }

  return (
    <div>
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
                onFocus={() => setFocusedKey(param.key)}
              />
            </div>
          );
        })}
      </div>

      {variables.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-fg-muted">Variables:</span>
          {variables.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertVariable(key)}
              className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-fg-secondary transition-colors hover:bg-accent-subtle hover:text-accent"
              title={targetKey ? `Insertar en "${targetKey}"` : undefined}
            >
              {"{{"}
              {key}
              {"}}"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
