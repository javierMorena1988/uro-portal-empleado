import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register } from "../../services/auth";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterForm.css";
import urovesaLogo from "../../assets/urovesa.png";

const registerSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email requerido"),
});

type RegisterData = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterData) => {
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await register(data.email);

      if (response.success) {
        setSuccess(true);
        // Después de 3 segundos, redirigir al login
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(response.error || "Error al procesar el registro");
      }
    } catch (error) {
      console.error('Register error:', error);
      setError("Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <div className="register-logo">
              <img src={urovesaLogo} alt="UROVESA" />
            </div>
            <h1 className="register-title">Registro Completado</h1>
          </div>
          <div className="register-success">
            <div className="success-icon">✓</div>
            <p className="success-message">
              Se ha enviado tu contraseña a tu correo electrónico.
            </p>
            <p className="success-hint">
              Revisa tu bandeja de entrada (y la carpeta de spam si no lo encuentras).
            </p>
            <p className="success-redirect">
              Serás redirigido al login en unos segundos...
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="register-button"
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="register-logo">
            <img src={urovesaLogo} alt="UROVESA" />
          </div>
          <h1 className="register-title">Crear Cuenta</h1>
          <p className="register-subtitle">
            Si no tienes contraseña, regístrate aquí y te enviaremos una por correo
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="register-form">
          <div className="form-group">
            <label className="form-label">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="tu.email@urovesa.com"
              {...registerField("email")}
              className="form-input"
            />
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
            )}
          </div>

          {error && <div className="form-error-message">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="register-button"
          >
            {isSubmitting ? "Procesando..." : "Registrarse"}
          </button>

          <div className="register-footer">
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="register-link">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
