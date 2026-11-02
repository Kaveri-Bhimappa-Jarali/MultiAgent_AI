import React from 'react'

export function Button({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-400/30 active:scale-[0.98]',
    secondary: 'bg-[#111827] hover:bg-[#1a2333] text-slate-200 border border-[#2d3748] hover:border-purple-500/40 active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500/30 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent',
    glow: 'bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 border border-purple-500/40 hover:border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size] || sizes.sm} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
