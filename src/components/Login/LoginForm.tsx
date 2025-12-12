import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks";
import { useNavigate } from "react-router-dom";
import { MESSAGES } from "../../constants";
import OtpInput from "react-otp-input";
import Setup2FA from "./Setup2FA";
import "./LoginForm.css";

const loginSchema = z.object({
  username: z.string().min(1, "Usuario o email requerido"),
  password: z.string().min(1, "Contraseña requerida"),
  twoFactorCode: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = React.useState(false);
  const [requires2FASetup, setRequires2FASetup] = React.useState(false);
  const [twoFactorCode, setTwoFactorCode] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setError("");
    
    try {
      // Si ya tenemos código 2FA, intentar login con él
      if (requiresTwoFactor && twoFactorCode) {
        const response = await login(data.username, data.password, twoFactorCode);
        if (response.success) {
          navigate("/");
        } else {
          setError(response.error || "Código de autenticación inválido");
          setTwoFactorCode(""); // Limpiar código para reintentar
        }
        return;
      }

      // Primer intento de login (sin código 2FA)
      const response = await login(data.username, data.password);
      
      if (response.requires2FASetup) {
        // Usuario no tiene 2FA configurado - mostrar pantalla de configuración
        setError(""); // Limpiar cualquier error previo
        setRequires2FASetup(true);
        setUsername(data.username);
        setPassword(data.password);
        return;
      } else if (response.requiresTwoFactor) {
        // Usuario tiene 2FA habilitado, pedir código
        setRequiresTwoFactor(true);
        setUsername(data.username);
        setPassword(data.password);
      } else if (response.success) {
        navigate("/");
      } else {
        setError(response.error || "Usuario o contraseña incorrectos");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Error al conectar con el servidor");
    }
  };

  // Si requiere configuración de 2FA, mostrar componente de setup
  if (requires2FASetup) {
    return (
      <Setup2FA
        username={username}
        password={password}
        onSetupComplete={async (verifiedCode: string) => {
          // Después de configurar 2FA, hacer login automáticamente con el código que acaba de verificar
          setRequires2FASetup(false);
          setTwoFactorCode(verifiedCode);
          setRequiresTwoFactor(true);
          
          // Hacer login automáticamente con el código 2FA que acaba de verificar
          try {
            const response = await login(username, password, verifiedCode);
            if (response.success) {
              navigate("/");
            } else {
              setError(response.error || "Error al completar el login");
              setTwoFactorCode(""); // Limpiar código si falla
            }
          } catch (error) {
            console.error('Login error:', error);
            setError("Error al conectar con el servidor");
            setTwoFactorCode(""); // Limpiar código si falla
          }
        }}
        onCancel={() => {
          setRequires2FASetup(false);
          setUsername("");
          setPassword("");
        }}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/src/assets/urovesa.png" alt="UROVESA" />
          </div>
          <h1 className="login-title">{MESSAGES.LOGIN.TITLE}</h1>
          <p className="login-subtitle">{MESSAGES.LOGIN.SUBTITLE}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="form-group">
            <label className="form-label">
              Usuario o Email
            </label>
            <input
              type="text"
              placeholder="usuario o tu.email@empresa.com"
              {...register("username")}
              className="form-input"
            />
            {errors.username && (
              <p className="form-error">{errors.username.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              {MESSAGES.LOGIN.PASSWORD_PLACEHOLDER}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className="form-input"
            />
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
          </div>

          {requiresTwoFactor && (
            <div className="form-group">
              <label className="form-label">
                Código de autenticación de doble factor
              </label>
              <div className="otp-input-container">
                <OtpInput
                  value={twoFactorCode}
                  onChange={setTwoFactorCode}
                  numInputs={6}
                  renderSeparator={<span>-</span>}
                  renderInput={(props) => <input {...props} />}
                  inputStyle={{
                    width: "3rem",
                    height: "3rem",
                    margin: "0 0.25rem",
                    fontSize: "1.25rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    textAlign: "center",
                  }}
                />
              </div>
              <p className="form-hint">
                Ingresa el código de 6 dígitos de tu aplicación de autenticación
              </p>
            </div>
          )}

          {error && <div className="form-error-message">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting || (requiresTwoFactor && twoFactorCode.length !== 6)}
            className="login-button"
          >
            {isSubmitting 
              ? "Accediendo..." 
              : requiresTwoFactor 
                ? "Verificar código" 
                : MESSAGES.LOGIN.SUBMIT_BUTTON}
          </button>

          <a href="#" className="forgot-password-link">
            ¿Olvidaste tu contraseña?
          </a>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
