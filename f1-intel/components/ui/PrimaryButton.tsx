import type { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`replay-button disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}
