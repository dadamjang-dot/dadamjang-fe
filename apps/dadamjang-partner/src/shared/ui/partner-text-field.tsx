import { TextField } from "@seed-design/react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const PartnerTextField = ({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label>
    {label}
    <TextField.Root>
      <TextField.Input {...props} aria-label={props["aria-label"] ?? label} />
    </TextField.Root>
  </label>
);

export const PartnerTextarea = ({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
  <label>
    {label}
    <TextField.Root>
      <TextField.Textarea
        {...props}
        aria-label={props["aria-label"] ?? label}
      />
    </TextField.Root>
  </label>
);
