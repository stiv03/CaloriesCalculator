// frontend/src/components/Button.jsx
import React from 'react';
import styles from './Button.module.css';

/**
 * Button primitive. Variants:
 *   - primary  (default) — solid accent
 *   - secondary          — outlined
 *   - danger             — solid red
 *   - ghost              — transparent
 * Pass `block` for full-width.
 */
export default function Button({
  variant = 'primary',
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], block ? styles.block : '', className]
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
