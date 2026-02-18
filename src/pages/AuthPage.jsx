import { useState } from 'react';

function AuthPage({
  user,
  profile,
  profileDraft,
  authView,
  authError,
  loginData,
  registerData,
  onChangeAuthView,
  onChangeLogin,
  onChangeRegister,
  onChangeProfileDraft,
  onLogin,
  onRecoverPassword,
  onRegister,
  onGoogleLogin,
  onSaveProfile,
  onLogout,
  onStartEditProfile,
  onCancelEditProfile,
  editingProfile,
  profileComplete,
  authLoading
}) {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  return (
    <section className="card auth-card">
      <h2>Cuenta</h2>
      {!user && (
        <div className="auth-flow">
          <p className="auth-helper">
            Entrá rápido con Google o elegí correo y contraseña. Solo te toma 1 minuto.
          </p>

          <div className="auth-switch">
            <button
              type="button"
              className={authView === 'login' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => onChangeAuthView('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={authView === 'register' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => onChangeAuthView('register')}
            >
              Registrarse
            </button>
          </div>

          <button type="button" className="btn-secondary" onClick={onGoogleLogin} disabled={authLoading}>
            {authLoading ? 'Redirigiendo…' : 'Ingresar con Google'}
          </button>

          {authView === 'login' ? (
            <form onSubmit={onLogin} className="profile-form">
              <h3>Ingresar con correo y contraseña</h3>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginData.email}
                onChange={(event) => onChangeLogin('email', event.target.value)}
                autoComplete="email"
                required
              />
              <div className="password-field">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={loginData.password}
                  onChange={(event) => onChangeLogin('password', event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn-secondary password-toggle"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                >
                  {showLoginPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Ingresando…' : 'Iniciar sesión'}
              </button>
              <button type="button" className="btn-link" onClick={onRecoverPassword} disabled={authLoading}>
                Olvidé mi contraseña
              </button>
              <button type="button" className="btn-link" onClick={() => onChangeAuthView('register')}>
                ¿No tenés cuenta? Registrate
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="profile-form">
              <h3>Crear cuenta</h3>
              <input
                type="text"
                placeholder="Nombre"
                value={registerData.firstName}
                onChange={(event) => onChangeRegister('firstName', event.target.value)}
                autoComplete="given-name"
                required
              />
              <input
                type="text"
                placeholder="Apellido"
                value={registerData.lastName}
                onChange={(event) => onChangeRegister('lastName', event.target.value)}
                autoComplete="family-name"
                required
              />
              <div className="phone-grid">
                <input
                  type="tel"
                  placeholder="Código país (54)"
                  value={registerData.countryCode}
                  onChange={(event) => onChangeRegister('countryCode', event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  required
                />
                <input
                  type="tel"
                  placeholder="Código área (11)"
                  value={registerData.areaCode}
                  onChange={(event) => onChangeRegister('areaCode', event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  required
                />
                <input
                  type="tel"
                  placeholder="Número"
                  value={registerData.phoneNumber}
                  onChange={(event) => onChangeRegister('phoneNumber', event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  required
                />
              </div>
              <small className="field-hint">Ejemplo: +54 11 12345678</small>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={registerData.email}
                onChange={(event) => onChangeRegister('email', event.target.value)}
                autoComplete="email"
                required
              />
              <div className="password-field">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={registerData.password}
                  onChange={(event) => onChangeRegister('password', event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="btn-secondary password-toggle"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                >
                  {showRegisterPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Creando cuenta…' : 'Registrarme'}
              </button>
              <button type="button" className="btn-link" onClick={() => onChangeAuthView('login')}>
                Ya tengo cuenta, quiero iniciar sesión
              </button>
            </form>
          )}
        </div>
      )}

      {user && !profileComplete && (
        <form onSubmit={onSaveProfile} className="profile-form">
          <h3>Completá tu perfil</h3>
          <input
            type="text"
            placeholder="Nombre"
            value={profileDraft.firstName}
            onChange={(event) => onChangeProfileDraft('firstName', event.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            value={profileDraft.lastName}
            onChange={(event) => onChangeProfileDraft('lastName', event.target.value)}
            required
          />
          <div className="phone-grid">
            <input
              type="tel"
              placeholder="Código país (54)"
              value={profileDraft.countryCode}
              onChange={(event) => onChangeProfileDraft('countryCode', event.target.value.replace(/\D/g, ''))}
              required
            />
            <input
              type="tel"
              placeholder="Código área (11)"
              value={profileDraft.areaCode}
              onChange={(event) => onChangeProfileDraft('areaCode', event.target.value.replace(/\D/g, ''))}
              required
            />
            <input
              type="tel"
              placeholder="Número"
              value={profileDraft.phoneNumber}
              onChange={(event) => onChangeProfileDraft('phoneNumber', event.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <button type="submit">Guardar perfil</button>
        </form>
      )}

      {user && profileComplete && !editingProfile && (
        <div className="profile-summary">
          <p>
            Sesión iniciada como <strong>{`${profile.firstName} ${profile.lastName}`}</strong>
          </p>
          <p>Email: {profile.email}</p>
          <p>Teléfono: {profile.phone}</p>
          <button type="button" onClick={onStartEditProfile}>
            Modificar nombre, apellido o teléfono
          </button>
          <button type="button" className="btn-secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      )}

      {user && profileComplete && editingProfile && (
        <form onSubmit={onSaveProfile} className="profile-form">
          <h3>Editar datos de cuenta</h3>
          <input
            type="text"
            placeholder="Nombre"
            value={profileDraft.firstName}
            onChange={(event) => onChangeProfileDraft('firstName', event.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            value={profileDraft.lastName}
            onChange={(event) => onChangeProfileDraft('lastName', event.target.value)}
            required
          />
          <div className="phone-grid">
            <input
              type="tel"
              placeholder="Código país (54)"
              value={profileDraft.countryCode}
              onChange={(event) => onChangeProfileDraft('countryCode', event.target.value.replace(/\D/g, ''))}
              required
            />
            <input
              type="tel"
              placeholder="Código área (11)"
              value={profileDraft.areaCode}
              onChange={(event) => onChangeProfileDraft('areaCode', event.target.value.replace(/\D/g, ''))}
              required
            />
            <input
              type="tel"
              placeholder="Número"
              value={profileDraft.phoneNumber}
              onChange={(event) => onChangeProfileDraft('phoneNumber', event.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <div className="profile-form-actions">
            <button type="submit">Guardar cambios</button>
            <button type="button" className="btn-secondary" onClick={onCancelEditProfile}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {authError && <p className="error">{authError}</p>}
    </section>
  );
}

export default AuthPage;
