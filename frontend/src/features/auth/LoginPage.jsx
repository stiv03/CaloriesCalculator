import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { setToken, setUserId } from '../../auth/storage';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { validateLogin } from './validation';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validateLogin(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const { token, userId } = await authApi.login(form);
      setToken(token);
      setUserId(userId);
      navigate('/today');
    } catch (err) {
      setServerError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <ErrorBanner message={serverError} onDismiss={() => setServerError('')} />
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Field label="Username" value={form.username} onChange={update('username')}
                 error={errors.username} autoComplete="username" />
          <PasswordField label="Password" value={form.password} onChange={update('password')}
                         error={errors.password} autoComplete="current-password" />
          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className={styles.foot}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
