import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <strong>QR Menu Platform</strong>
          <Link href="/master/login">Master Admin</Link>
        </div>
      </div>

      <main className="container">
        <section className="hero-card">
          <div className="hero-copy">
            <h1 className="hero-title">Fast QR menu platform for many stores</h1>
            <p className="hero-text">
              One system for many store pages. Simple tools for owners. Fast pages for customers.
            </p>
            <div className="inline-actions">
              <Link className="button fit-button" href="/master/login">Open Master Admin</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
