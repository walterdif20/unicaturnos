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
      {!user && (
        <div className="auth-flow">
          <p className="auth-helper">
            Si no tenes cuenta completa tus datos, solo te toma 1 minuto.
          </p>

          <div className="auth-switch">
            <button
              type="button"
              className={authView === 'register' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => onChangeAuthView('register')}
            >
              Registrarse
            </button>
            <button
              type="button"
              className={authView === 'login' ? 'auth-tab auth-tab-active' : 'auth-tab'}
              onClick={() => onChangeAuthView('login')}
            >
              Iniciar sesión
            </button>
          </div>


          {authView === 'login' ? (
            <form onSubmit={onLogin} className="profile-form">
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
            </form>
          ) : (
            <form onSubmit={onRegister} className="profile-form">
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={registerData.fullName}
                onChange={(event) => onChangeRegister('fullName', event.target.value)}
                autoComplete="name"
                required
              />
              <div className="phone-grid">
                <select value={registerData.countryCode} onChange={(event) => onChangeRegister('countryCode', event.target.value)} required>
                  <option value="54">+54 Argentina</option>
                </select>
                <input
                  type="tel"
                  placeholder="Código área (2262)"
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
              <small className="field-hint">Ejemplo: +54 2262 451123</small>

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
                </button><br />
                  <small>Elegí una contraseña, si la olvidas podrás recuperarla con tu correo</small>
              </div>
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Creando cuenta…' : 'Registrarme'}
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
            placeholder="Nombre y apellido"
            value={profileDraft.fullName}
            onChange={(event) => onChangeProfileDraft('fullName', event.target.value)}
            required
          />
          <div className="phone-grid">
            <select value={profileDraft.countryCode} onChange={(event) => onChangeProfileDraft('countryCode', event.target.value)} required>
              <option value="54">54 AR</option>
            </select>
            <input
              type="tel"
              placeholder="Código área (2262)"
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
            placeholder="Nombre y apellido"
            value={profileDraft.fullName}
            onChange={(event) => onChangeProfileDraft('fullName', event.target.value)}
            required
          />
          <div className="phone-grid">
            <select value={profileDraft.countryCode} onChange={(event) => onChangeProfileDraft('countryCode', event.target.value)} required>
              <option value="54">54 AR</option>
            </select>
            <input
              type="tel"
              placeholder="Código área (2262)"
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
