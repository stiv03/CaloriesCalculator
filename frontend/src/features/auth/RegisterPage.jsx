// frontend/src/features/auth/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { setToken, setUserId } from '../../auth/storage';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { validateRegister } from './validation';
import styles from './RegisterPage.module.css';

const EMPTY = {
  name: '', age: '', gender: '', weight: '', height: '',
  username: '', password: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validateRegister(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const { token, userId } = await authApi.register({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        weight: Number(form.weight),
        height: Number(form.height),
        username: form.username,
        password: form.password,
      });
      setToken(token);
      setUserId(userId);
      navigate('/today');
    } catch (err) {
      setServerError(err.message || 'Registration failed');
      if (err.fieldErrors) setErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Field label="Name" value={form.name} onChange={update('name')}
                 error={errors.name} autoComplete="name" />
          <Field label="Age" type="number" value={form.age} onChange={update('age')}
                 error={errors.age} min="1" />
          <Field label="Gender" as="select" value={form.gender} onChange={update('gender')}
                 error={errors.gender}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Field>
          <Field label="Weight (kg)" type="number" step="0.1" value={form.weight}
                 onChange={update('weight')} error={errors.weight} min="1" />
          <Field label="Height (cm)" type="number" value={form.height}
                 onChange={update('height')} error={errors.height} min="1" />
          <Field label="Username" value={form.username} onChange={update('username')}
                 error={errors.username} autoComplete="username" />
          <PasswordField label="Password" value={form.password} onChange={update('password')}
                         error={errors.password} autoComplete="new-password" />
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className={styles.foot}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
