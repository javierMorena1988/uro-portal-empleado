import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useBlockBrowserBack } from "../../hooks";
import { useNavigate, Link } from "react-router-dom";
import { MESSAGES } from "../../constants";
import OtpInput from "react-otp-input";
import Setup2FA from "./Setup2FA";
import { OTP_INPUT_STYLE, renderNumericOtpInput, sanitizeOtpValue } from "./otpInputConfig";
import "./LoginForm.css";
import urovesaLogo from "../../assets/urovesa.png";

const loginSchema = z.object({
  email: z.string().email("Introduce un correo electrónico válido").min(1, "Correo requerido"),
  password: z.string().min(1, "Contraseña requerida"),
  twoFactorCode: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  useBlockBrowserBack();
  const [error, setError] = React.useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = React.useState(false);
  const [requires2FASetup, setRequires2FASetup] = React.useState(false);
  const [twoFactorCode, setTwoFactorCode] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const handleOtpChange = (value: string) => {
    setTwoFactorCode(sanitizeOtpValue(value));
  };

  const onSubmit = async (data: LoginData) => {
    setError("");
    
    try {
      if (requiresTwoFactor && twoFactorCode) {
        const response = await login(data.email, data.password, twoFactorCode);
        if (response.success) {
          navigate("/");
        } else {
          setError(response.error || "Código de autenticación inválido");
          setTwoFactorCode("");
        }
        return;
      }

      const response = await login(data.email, data.password);
      
      if (response.mustChangePassword) {
        const email = response.email || response.username || data.email;
        navigate('/change-password', { state: { email, oldPassword: data.password } });
        return;
      } else if (response.requires2FASetup) {
        setError("");
        setRequires2FASetup(true);
        setUserEmail(data.email);
        setPassword(data.password);
        return;
      } else if (response.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setUserEmail(data.email);
        setPassword(data.password);
      } else if (response.success) {
        navigate("/");
      } else {
        setError(response.error || "Correo o contraseña incorrectos");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Error al conectar con el servidor");
    }
  };

  if (requires2FASetup) {
    return (
      <Setup2FA
        username={userEmail}
        password={password}
        allowCancel={false}
        onSetupComplete={async (verifiedCode: string) => {
          setRequires2FASetup(false);
          setTwoFactorCode(verifiedCode);
          
          try {
            const response = await login(userEmail, password, verifiedCode);
            if (response.success) {
              navigate("/");
            } else if (response.mustChangePassword) {
              navigate('/change-password', { state: { email: userEmail, oldPassword: password } });
            } else {
              if (response.requiresTwoFactor) {
                setRequiresTwoFactor(true);
              }
              setError(response.error || "Error al completar el login");
              setTwoFactorCode("");
            }
          } catch (error) {
            console.error('Login error:', error);
            setError("Error al conectar con el servidor");
            setTwoFactorCode("");
          }
        }}
        onCancel={() => {
          setRequires2FASetup(true);
        }}
      />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={urovesaLogo} alt="UROVESA" />
          </div>
          <h1 className="login-title">{MESSAGES.LOGIN.TITLE}</h1>
          <p className="login-subtitle">{MESSAGES.LOGIN.SUBTITLE}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="form-group">
            <label className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="tu.email@urovesa.com"
              {...register("email")}
              className="form-input"
              autoComplete="email"
            />
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
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
              autoComplete="current-password"
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
                  onChange={handleOtpChange}
                  numInputs={6}
                  renderSeparator={<span>-</span>}
                  renderInput={renderNumericOtpInput}
                  inputStyle={OTP_INPUT_STYLE}
                  shouldAutoFocus
                />
              </div>
              <p className="form-hint">
                Introduce solo números: el código de 6 dígitos de tu app de autenticación
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

          <div className="login-footer">
            <Link to="/register" className="register-link">
              ¿No tienes contraseña? Regístrate aquí
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
