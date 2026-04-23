export default function MasterLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="container narrow-container">
      <div className="card form-card">
        <div className="page-intro">
          <h1 className="page-title">Master Admin Login</h1>
          <p className="muted">Sign in with your platform admin account.</p>
        </div>

        <LoginError searchParams={searchParams} />

        <form method="post" action="/api/master/login" className="grid">
          <div>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" className="input" autoComplete="username" required />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>

          <button className="button" type="submit">Sign In</button>
        </form>
      </div>
    </main>
  );
}

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return sp.error ? <div className="error">{decodeURIComponent(sp.error)}</div> : null;
}
