// frontend/src/components/Field.jsx
import React, { useId } from 'react';
import styles from './Field.module.css';

/**
 * Labeled form field with inline error slot.
 * Pass `as="select"` to render a select with <option> children.
 */
export default function Field({
  label,
  error,
  as = 'input',
  className,
  children,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const Tag = as;
  const inputClass = [styles.input, error ? styles.inputError : ''].filter(Boolean).join(' ');
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <Tag id={id} className={inputClass} aria-invalid={!!error} {...rest}>
        {children}
      </Tag>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
