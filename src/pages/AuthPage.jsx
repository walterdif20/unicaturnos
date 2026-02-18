function AuthPage({
  user,
  profile,
  authError,
  loginData,
  registerData,
  onChangeLogin,
  onChangeRegister,
  onLogin,
  onRegister,
  onLogout
}) {
  return (
    <section className="card">
      <h2>Cuenta</h2>
      {user ? (
        <div>
          <p>
            Sesión iniciada como <strong>{profile ? `${profile.firstName} ${profile.lastName}` : user.email}</strong>
          </p>
          <button type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="auth-grid">
          <form onSubmit={onLogin}>
            <h3>Ingresar</h3>
            <input
              type="email"
              placeholder="Email"
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
            <button type="submit">Ingresar</button>
          </form>

          <form onSubmit={onRegister}>
            <h3>Registro</h3>
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
            <input
              type="tel"
              placeholder="Celular"
              value={registerData.phone}
              onChange={(event) => onChangeRegister('phone', event.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
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
            />
            <button type="submit">Crear cuenta</button>
          </form>
        </div>
      )}
      {authError && <p className="error">{authError}</p>}
    </section>
  );
}

export default AuthPage;
