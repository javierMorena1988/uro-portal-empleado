import React, { useState, useEffect } from 'react';
import { getUsers, getUser, changeUserPassword, resetUserPassword, deleteUser, User } from '../../services/admin';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [action, setAction] = useState<'change' | 'reset' | 'delete' | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'mock' | 'ldap'>('mock');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const response = await getUsers();
    if (response.success) {
      setUsers(response.users);
      setMode(response.mode);
    } else {
      setError(response.error || 'Error al cargar usuarios');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError(null);
    const response = await changeUserPassword(selectedUser.username, newPassword);
    
    if (response.success) {
      setMessage('Contraseña cambiada correctamente');
      setAction(null);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setError(response.error || 'Error al cambiar contraseña');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);
    const response = await resetUserPassword(selectedUser.username, true);
    
    if (response.success) {
      if (response.password) {
        setMessage(`Contraseña reseteada: ${response.password}. ${response.warning || ''}`);
      } else {
        setMessage('Contraseña reseteada y enviada por correo correctamente');
      }
      setAction(null);
      setTimeout(() => setMessage(null), 5000);
    } else {
      setError(response.error || 'Error al resetear contraseña');
    }
    setLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${selectedUser.username}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    const response = await deleteUser(selectedUser.username);
    
    if (response.success) {
      setMessage('Usuario eliminado correctamente');
      setAction(null);
      setSelectedUser(null);
      loadUsers();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setError(response.error || 'Error al eliminar usuario');
    }
    setLoading(false);
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>Gestión de Usuarios</h1>
        <button onClick={loadUsers} className="btn-refresh" disabled={loading}>
          🔄 Actualizar
        </button>
      </div>

      {message && (
        <div className="message success">
          {message}
        </div>
      )}

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {mode === 'ldap' && (
        <div className="message info">
          <strong>Modo LDAP:</strong> La eliminación de usuarios no está disponible. Usa las herramientas de administración de Active Directory.
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="loading">Cargando usuarios...</div>
      ) : (
        <>
          <div className="users-list">
            <h2>Usuarios ({users.length})</h2>
            {users.length === 0 ? (
              <p>No hay usuarios registrados</p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Nombre</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.displayName}</td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setAction('change');
                            setError(null);
                            setMessage(null);
                          }}
                          className="btn-action"
                        >
                          Cambiar Contraseña
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setAction('reset');
                            setError(null);
                            setMessage(null);
                          }}
                          className="btn-action"
                        >
                          Resetear Contraseña
                        </button>
                        {mode === 'mock' && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setAction('delete');
                              setError(null);
                              setMessage(null);
                            }}
                            className="btn-action btn-danger"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {action && selectedUser && (
            <div className="action-modal">
              <div className="modal-content">
                <h3>
                  {action === 'change' && `Cambiar contraseña de ${selectedUser.username}`}
                  {action === 'reset' && `Resetear contraseña de ${selectedUser.username}`}
                  {action === 'delete' && `Eliminar usuario ${selectedUser.username}`}
                </h3>

                {action === 'change' && (
                  <div className="form-group">
                    <label>Nueva Contraseña:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <label>Confirmar Contraseña:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                    />
                  </div>
                )}

                {action === 'reset' && (
                  <div className="form-group">
                    <p>Se generará una nueva contraseña y se enviará por correo a: <strong>{selectedUser.email}</strong></p>
                  </div>
                )}

                {action === 'delete' && (
                  <div className="form-group">
                    <p className="warning">
                      ⚠️ Esta acción no se puede deshacer. El usuario <strong>{selectedUser.username}</strong> será eliminado permanentemente.
                    </p>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setAction(null);
                      setSelectedUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                    className="btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (action === 'change') handleChangePassword();
                      if (action === 'reset') handleResetPassword();
                      if (action === 'delete') handleDeleteUser();
                    }}
                    className="btn-confirm"
                    disabled={loading || (action === 'change' && (!newPassword || !confirmPassword))}
                  >
                    {loading ? 'Procesando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;
