import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ id, label, hint, error, className, ...input }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-body">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cx(
          "min-h-11 w-full rounded-control border bg-surface px-5 text-body",
          error ? "border-danger" : "border-ink",
        )}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  id: string;
  label: string;
  error?: string;
};

export function TextAreaField({ id, label, error, className, ...textarea }: TextAreaFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-body">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cx(
          "min-h-24 w-full rounded-control border bg-surface px-5 py-3 text-body",
          error ? "border-danger" : "border-ink",
        )}
        {...textarea}
      />
      {error && (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
