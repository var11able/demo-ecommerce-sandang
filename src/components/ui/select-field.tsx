import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  id: string;
  label: string;
  placeholder: string;
  options: readonly (string | { value: string; label: string })[];
  error?: string;
};

export function SelectField({
  id,
  label,
  placeholder,
  options,
  error,
  className,
  ...select
}: SelectFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-body">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cx(
          "min-h-11 w-full appearance-none rounded-control border bg-surface px-5 text-body",
          error ? "border-danger" : "border-ink",
        )}
        {...select}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const { value, label } =
            typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
