"use client";

import { forwardRef, useState } from "react";

/**
 * Password input with a show/hide toggle.
 *
 * Forwards its ref and spreads all input props, so it drops into both
 * controlled forms (value/onChange) and react-hook-form (`{...register(...)}`).
 * Pass the field's `className` exactly as you would a plain <input>; we append
 * right-padding so text never runs under the eye button.
 */
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  className?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ className = "", ...props }, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={className + " pr-11"}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted hover:text-heading"
        >
          <i className={`fas ${show ? "fa-eye-slash" : "fa-eye"} text-[13px]`} />
        </button>
      </div>
    );
  },
);
