import type { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full bg-pitwall-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pitwall-400 disabled:cursor-not-allowed disabled:bg-slate-600 ${className}`}
    />
  );
}
