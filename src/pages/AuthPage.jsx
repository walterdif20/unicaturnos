function AuthPage({
  user,
  profile,
  profileDraft,
  authView,
  authError,
  onChangeAuthView,
  onChangeProfileDraft,
  onLoginWithGoogle,
  onSaveProfile,
  onLogout,
  profileComplete
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
          <p>
            {authView === 'login'
              ? 'Iniciá sesión con tu cuenta de Google para acceder a tus turnos.'
              : 'Registrate con Google y luego completá tus datos para poder reservar.'}
          </p>
          <button type="button" onClick={onLoginWithGoogle}>
            Continuar con Google
          </button>
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

      {user && profileComplete && (
        <div className="profile-summary">
          <p>
            Sesión iniciada como <strong>{`${profile.firstName} ${profile.lastName}`}</strong>
          </p>
          <p>Email: {profile.email}</p>
          <p>Teléfono: {profile.phone}</p>
          <button type="button" className="btn-secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      )}

      {authError && <p className="error">{authError}</p>}
    </section>
  );
}

export default AuthPage;
