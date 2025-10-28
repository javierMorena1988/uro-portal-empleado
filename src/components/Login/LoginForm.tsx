import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks";
import { useNavigate } from "react-router-dom";
import "./LoginForm.css";

const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

type LoginData = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setError("");
    const ok = await login(data.email, data.password);
    if (ok) {
      navigate("/");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="login-header">
          <div className="login-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="login-icon-svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 0115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75V19.5z" />
            </svg>
          </div>
          <h2 className="login-title">Iniciar sesión</h2>
        </div>
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            placeholder="nombre@empresa.com"
            {...register("email")}
            className="form-input"
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            placeholder="********"
            {...register("password")}
            className="form-input"
          />
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>
        
        {error && <div className="form-error-message">{error}</div>}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="login-button"
        >
          {isSubmitting ? "Accediendo..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
