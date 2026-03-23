import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks';
import './ChangePasswordFirstLogin.css';

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  oldPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmNewPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmNewPassword'],
});

type FormData = z.infer<typeof schema>;

const ChangePasswordFirstLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { changePassword } = useAuth();
  const [error, setError] = React.useState<string>('');
  const [success, setSuccess] = React.useState<string>('');

  const state = (location.state as { username?: string; oldPassword?: string } | null) ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: state?.username || '',
      oldPassword: state?.oldPassword || '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  React.useEffect(() => {
    if (state?.username) setValue('username', state.username);
  }, [setValue, state?.username]);

  const onSubmit = async (data: FormData) => {
    setError('');
    setSuccess('');
    const ok = await changePassword(data.username, data.oldPassword, data.newPassword);
    if (!ok) {
      setError('No se pudo cambiar la contraseña. Revisa la contraseña actual y vuelve a intentarlo.');
      return;
    }
    setSuccess('Contraseña cambiada correctamente. Ahora puedes iniciar sesión con la nueva contraseña.');
    // Volver al login después de un momento
    setTimeout(() => navigate('/login'), 1200);
  };

  return (
    <div className="cpfl-container">
      <div className="cpfl-card">
        <h1 className="cpfl-title">Cambio de contraseña obligatorio</h1>
        <p className="cpfl-subtitle">
          Por seguridad, debes cambiar la contraseña temporal en tu primer acceso.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="cpfl-form">
          <div className="cpfl-group">
            <label className="cpfl-label">Usuario</label>
            <input className="cpfl-input" placeholder="usuario" {...register('username')} />
            {errors.username && <p className="cpfl-error">{errors.username.message}</p>}
          </div>

          <div className="cpfl-group">
            <label className="cpfl-label">Contraseña actual</label>
            <input className="cpfl-input" type="password" placeholder="••••••••" {...register('oldPassword')} />
            {errors.oldPassword && <p className="cpfl-error">{errors.oldPassword.message}</p>}
          </div>

          <div className="cpfl-group">
            <label className="cpfl-label">Nueva contraseña</label>
            <input className="cpfl-input" type="password" placeholder="••••••••" {...register('newPassword')} />
            {errors.newPassword && <p className="cpfl-error">{errors.newPassword.message}</p>}
          </div>

          <div className="cpfl-group">
            <label className="cpfl-label">Confirmar nueva contraseña</label>
            <input className="cpfl-input" type="password" placeholder="••••••••" {...register('confirmNewPassword')} />
            {errors.confirmNewPassword && <p className="cpfl-error">{errors.confirmNewPassword.message}</p>}
          </div>

          {error && <div className="cpfl-error-box">{error}</div>}
          {success && <div className="cpfl-success-box">{success}</div>}

          <button className="cpfl-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>

          <div className="cpfl-footer">
            <Link to="/login">Volver al login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordFirstLogin;

