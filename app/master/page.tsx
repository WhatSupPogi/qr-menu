import Link from 'next/link';
import { requireMasterSession, listMasterStores } from '@/lib/app';

export const dynamic = 'force-dynamic';

type PageSearchParams = Promise<{
  q?: string;
  status?: string;
  business_type?: string;
}>;

export default async function MasterPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireMasterSession();
  const { stores, attempts, actions } = await listMasterStores();
  const query = (await searchParams).q?.trim().toLowerCase() || '';
  const statusFilter = (await searchParams).status || 'all';
  const businessTypeFilter = (await searchParams).business_type || 'all';

  const filteredStores = stores.filter((store) => {
    const matchesQuery =
      !query ||
      store.name.toLowerCase().includes(query) ||
      store.slug.toLowerCase().includes(query) ||
      store.owner_phone.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    const matchesBusinessType = businessTypeFilter === 'all' || store.business_type === businessTypeFilter;

    return matchesQuery && matchesStatus && matchesBusinessType;
  });

  return (
    <main className="container master-shell">
      <section className="header-card">
        <div>
          <h1 className="page-title" style={{ marginBottom: 6 }}>Master Admin</h1>
          <p className="muted" style={{ margin: 0 }}>
            Create stores, manage plans, download QR codes, and control access.
          </p>
        </div>

        <form action="/api/master/logout" method="post">
          <button className="button secondary fit-button" type="submit">Sign Out</button>
        </form>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <div className="muted">Total Stores</div>
          <div className="kpi small-kpi">{stores.length}</div>
        </div>
        <div className="card stat-card">
          <div className="muted">Active Stores</div>
          <div className="kpi small-kpi">{stores.filter((s) => s.status === 'active').length}</div>
        </div>
        <div className="card stat-card">
          <div className="muted">Suspended Stores</div>
          <div className="kpi small-kpi">{stores.filter((s) => s.status === 'suspended').length}</div>
        </div>
      </section>

      <section className="card form-card">
        <div className="section-head compact-head">
          <div>
            <h2 className="section-title">Create Store</h2>
            <p className="muted section-text">Add a new store and create the owner login at the same time.</p>
          </div>
        </div>

        <form className="grid grid-3" action="/api/master/store" method="post">
          <div>
            <label>Business Type</label>
            <select className="select" name="business_type" defaultValue="sari_sari">
              <option value="sari_sari">Sari-Sari</option>
              <option value="restaurant">Restaurant</option>
            </select>
          </div>

          <div>
            <label>Plan</label>
            <select className="select" name="plan_type" defaultValue="basic">
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="plus">Plus</option>
            </select>
          </div>

          <div>
            <label>Store Name</label>
            <input className="input" name="name" required />
          </div>

          <div>
            <label>Owner Name</label>
            <input className="input" name="owner_name" required />
          </div>

          <div>
            <label>Contact Number</label>
            <input className="input" name="owner_phone" required />
          </div>

          <div>
            <label>Location</label>
            <input className="input" name="location" required />
          </div>

          <div>
            <label>Monthly Price</label>
            <input className="input" name="monthly_price" type="number" step="0.01" min="0" required />
          </div>

          <div>
            <label>Admin Email</label>
            <input className="input" name="admin_email" type="email" />
          </div>

          <div>
            <label>Admin Password</label>
            <input className="input" name="admin_password" type="text" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="button fit-button" type="submit">Create Store</button>
          </div>
        </form>
      </section>

      <section className="card table-card">
        <div className="section-head section-head-stack">
          <div>
            <h2 className="section-title">Stores</h2>
            <p className="muted section-text">Search by store name, slug, or contact number.</p>
          </div>

          <form className="toolbar-grid" method="get">
            <input
              className="input"
              name="q"
              defaultValue={query}
              placeholder="Search stores"
            />

            <select className="select" name="status" defaultValue={statusFilter}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <select className="select" name="business_type" defaultValue={businessTypeFilter}>
              <option value="all">All Types</option>
              <option value="sari_sari">Sari-Sari</option>
              <option value="restaurant">Restaurant</option>
            </select>

            <button className="button fit-button" type="submit">Apply</button>
          </form>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <strong>No stores found.</strong>
                      <p className="muted" style={{ margin: 0 }}>Try a different search or filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
                  <tr key={store.id}>
                    <td>
                      <strong>{store.name}</strong>
                      <div className="muted">/{store.slug}</div>
                    </td>
                    <td>{store.business_type}</td>
                    <td>{store.plan_type}</td>
                    <td>{store.owner_phone}</td>
                    <td>
                      <span className={`badge ${store.status === 'active' ? 'ok' : 'warn'}`}>
                        {store.status}
                      </span>
                    </td>
                    <td>{new Date(store.created_at).toLocaleString()}</td>
                    <td>
                      <div className="action-stack">
                        <form action="/api/master/store" method="post" className="grid">
                          <input type="hidden" name="mode" value="status" />
                          <input type="hidden" name="store_id" value={store.id} />
                          <input type="hidden" name="status" value={store.status === 'active' ? 'suspended' : 'active'} />
                          <button className="button secondary fit-button" type="submit">
                            {store.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </form>

                        <form action="/api/master/store" method="post" className="grid">
                          <input type="hidden" name="mode" value="plan" />
                          <input type="hidden" name="store_id" value={store.id} />
                          <select className="select" name="plan_type" defaultValue={store.plan_type}>
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="plus">Plus</option>
                          </select>
                          <button className="button secondary fit-button" type="submit">Update Plan</button>
                        </form>

                        <DownloadQR slug={store.slug} />
                        <Link href={`/store/${store.slug}`} className="button secondary fit-button">Open Store Page</Link>
                        <Link href={`/admin/${store.slug}`} className="button secondary fit-button">Open Admin Page</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card table-card">
          <h2 className="section-title">Recent Login Attempts</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Username</th>
                  <th>Result</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((row: any) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.username}</td>
                    <td>{row.success ? 'Success' : 'Failed'}</td>
                    <td>{row.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card table-card">
          <h2 className="section-title">Recent Admin Actions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((row: any) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.action_type}</td>
                    <td><small>{JSON.stringify(row.details)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function DownloadQR({ slug }: { slug: string }) {
  return (
    <form action={`/api/master/store?slug=${encodeURIComponent(slug)}`} method="get">
      <button className="button secondary fit-button" type="submit">Download QR</button>
    </form>
  );
}
