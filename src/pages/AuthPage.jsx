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
  return (
    <section className="card auth-card">
      <h2>Cuenta</h2>
      {!user && (
        <div className="auth-flow">
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
            Ingresar con Google
          </button>

          {authView === 'login' ? (
            <form onSubmit={onLogin} className="profile-form">
              <h3>Ingresar con correo y contraseña</h3>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginData.email}
                onChange={(event) => onChangeLogin('email', event.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={loginData.password}
                onChange={(event) => onChangeLogin('password', event.target.value)}
                required
              />
              <button type="submit">Iniciar sesión</button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="profile-form">
              <h3>Crear cuenta</h3>
              <input
                type="text"
                placeholder="Nombre"
                value={registerData.firstName}
                onChange={(event) => onChangeRegister('firstName', event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Apellido"
                value={registerData.lastName}
                onChange={(event) => onChangeRegister('lastName', event.target.value)}
                required
              />
              <div className="phone-grid">
                <input
                  type="tel"
                  placeholder="Código país (54)"
                  value={registerData.countryCode}
                  onChange={(event) => onChangeRegister('countryCode', event.target.value.replace(/\D/g, ''))}
                  required
                />
                <input
                  type="tel"
                  placeholder="Código área (11)"
                  value={registerData.areaCode}
                  onChange={(event) => onChangeRegister('areaCode', event.target.value.replace(/\D/g, ''))}
                  required
                />
                <input
                  type="tel"
                  placeholder="Número"
                  value={registerData.phoneNumber}
                  onChange={(event) => onChangeRegister('phoneNumber', event.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={registerData.email}
                onChange={(event) => onChangeRegister('email', event.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={registerData.password}
                onChange={(event) => onChangeRegister('password', event.target.value)}
                required
                minLength={6}
              />
              <button type="submit">Registrarme</button>
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
