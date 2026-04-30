import Link from 'next/link';
import { requireMasterSession, listMasterStores } from '@/lib/app';

export default async function MasterPage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    type?: string;
  }>;
}) {
  await requireMasterSession();
  const { stores, attempts, actions } = await listMasterStores();

  const params = (await searchParams) || {};
  const q = (params.q || '').trim().toLowerCase();
  const status = (params.status || '').trim().toLowerCase();
  const type = (params.type || '').trim().toLowerCase();

  const filteredStores = stores.filter((store: any) => {
    const matchesQ =
      !q ||
      store.name.toLowerCase().includes(q) ||
      store.slug.toLowerCase().includes(q) ||
      store.owner_phone.toLowerCase().includes(q);

    const matchesStatus = !status || status === 'all' || store.status.toLowerCase() === status;
    const matchesType = !type || type === 'all' || store.business_type.toLowerCase() === type;

    return matchesQ && matchesStatus && matchesType;
  });

  const totalStores = stores.length;
  const activeStores = stores.filter((s: any) => s.status === 'active').length;
  const suspendedStores = stores.filter((s: any) => s.status === 'suspended').length;

  return (
    <main className="container">
      <section className="card hero-card">
        <div className="between">
          <div>
            <h1 className="hero-title">Master Admin</h1>
            <p className="hero-text">Create stores, manage plans, download QR codes, and control access.</p>
          </div>
          <form action="/api/master/logout" method="post">
            <button className="button secondary" type="submit">Sign Out</button>
          </form>
        </div>
      </section>

      <section className="grid grid-3">
        <div className="card stat-card">
          <div className="stat-label">Total Stores</div>
          <div className="stat-value">{totalStores}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Active Stores</div>
          <div className="stat-value">{activeStores}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Suspended Stores</div>
          <div className="stat-value">{suspendedStores}</div>
        </div>
      </section>

      <section className="card form-card">
        <h2 className="section-title">Create Store</h2>
        <p className="section-subtext">Add a new store and create the owner login at the same time.</p>

        <form action="/api/master/store" method="post" className="stack gap-16">
          <div className="grid grid-3">
            <label className="field">
              <span>Business Type</span>
              <select name="business_type" defaultValue="sari_sari">
                <option value="sari_sari">Sari-Sari</option>
                <option value="restaurant">Restaurant</option>
              </select>
            </label>

            <label className="field">
              <span>Plan</span>
              <select name="plan_type" defaultValue="basic">
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="plus">Plus</option>
              </select>
            </label>

            <label className="field">
              <span>Store Name</span>
              <input name="name" required />
            </label>

            <label className="field">
              <span>Owner Name</span>
              <input name="owner_name" required />
            </label>

            <label className="field">
              <span>Contact Number</span>
              <input name="owner_phone" required />
            </label>

            <label className="field">
              <span>Location</span>
              <input name="location" required />
            </label>

            <label className="field">
              <span>Monthly Price</span>
              <input name="monthly_price" type="number" min="0" step="0.01" defaultValue="0" required />
            </label>

            <label className="field">
              <span>Admin Email</span>
              <input name="admin_email" type="email" />
            </label>

            <label className="field">
              <span>Admin Password</span>
              <input name="admin_password" type="text" />
            </label>
          </div>

          <div>
            <button className="button" type="submit">Create Store</button>
          </div>
        </form>
      </section>

      <section className="card table-card">
        <h2 className="section-title">Stores</h2>
        <p className="section-subtext">Search by store name, slug, or contact number.</p>

        <form method="get" className="toolbar">
          <input type="text" name="q" placeholder="Search stores" defaultValue={params.q || ''} />

          <select name="status" defaultValue={params.status || 'all'}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <select name="type" defaultValue={params.type || 'all'}>
            <option value="all">All Types</option>
            <option value="sari_sari">Sari-Sari</option>
            <option value="restaurant">Restaurant</option>
          </select>

          <button className="button" type="submit">Apply</button>
        </form>

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
              {filteredStores.map((store: any) => (
                <tr key={store.id}>
                  <td>
                    <strong>{store.name}</strong>
                    <div><small>/{store.slug}</small></div>
                  </td>
                  <td>{store.business_type}</td>
                  <td>{store.plan_type}</td>
                  <td>{store.owner_phone}</td>
                  <td><span className={`badge ${store.status}`}>{store.status}</span></td>
                  <td>{new Date(store.created_at).toLocaleString()}</td>
                  <td>
                    <div className="stack gap-16">
                      <form action="/api/master/store" method="post" className="stack gap-8">
                        <input type="hidden" name="mode" value="update_store" />
                        <input type="hidden" name="store_id" value={store.id} />
                        <div className="grid grid-2">
                          <label className="field">
                            <span>Store Name</span>
                            <input name="name" defaultValue={store.name} required />
                          </label>
                          <label className="field">
                            <span>Owner Name</span>
                            <input name="owner_name" defaultValue={store.owner_name || ''} required />
                          </label>
                          <label className="field">
                            <span>Contact Number</span>
                            <input name="owner_phone" defaultValue={store.owner_phone || ''} required />
                          </label>
                          <label className="field">
                            <span>Location</span>
                            <input name="location" defaultValue={store.location || ''} required />
                          </label>
                          <label className="field">
                            <span>Monthly Price</span>
                            <input name="monthly_price" type="number" min="0" step="0.01" defaultValue={store.monthly_price || 0} />
                          </label>
                          <label className="field">
                            <span>Promo Banner</span>
                            <input name="promo_banner" defaultValue={store.promo_banner || ''} placeholder="Today only: Free delivery nearby!" />
                          </label>
                        </div>
                        <button className="button secondary fit-button" type="submit">Update Store Info</button>
                      </form>

                      <form action="/api/master/store" method="post" className="grid grid-2">
                        <input type="hidden" name="mode" value="update_login" />
                        <input type="hidden" name="store_id" value={store.id} />
                        <label className="field">
                          <span>Admin Email</span>
                          <input name="admin_email" type="email" placeholder="owner@email.com" required />
                        </label>
                        <label className="field">
                          <span>New Password</span>
                          <input name="admin_password" type="text" placeholder="Leave blank to keep current password" />
                        </label>
                        <button className="button secondary fit-button" type="submit">Update Login</button>
                      </form>

                      <div className="inline-actions wrap-actions">
                        <form action="/api/master/store" method="post">
                          <input type="hidden" name="mode" value="status" />
                          <input type="hidden" name="store_id" value={store.id} />
                          <input type="hidden" name="status" value={store.status === 'active' ? 'suspended' : 'active'} />
                          <button className="button secondary fit-button" type="submit">
                            {store.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </form>

                        <form action="/api/master/store" method="post" className="inline-actions">
                          <input type="hidden" name="mode" value="plan" />
                          <input type="hidden" name="store_id" value={store.id} />
                          <select name="plan_type" defaultValue={store.plan_type}>
                            <option value="basic">Basic</option>
                            <option value="standard">Standard</option>
                            <option value="plus">Plus</option>
                          </select>
                          <button className="button secondary fit-button" type="submit">Update Plan</button>
                        </form>

                        <a className="button secondary fit-button" href={`/api/master/store?slug=${encodeURIComponent(store.slug)}`}>
                          Download QR
                        </a>

                        <Link href={`/store/${store.slug}`} className="button secondary fit-button">
                          Open Store Page
                        </Link>

                        <Link href={`/admin/${store.slug}`} className="button secondary fit-button">
                          Open Admin Page
                        </Link>

                        <form action="/api/master/store" method="post">
                          <input type="hidden" name="mode" value="delete_store" />
                          <input type="hidden" name="store_id" value={store.id} />
                          <button className="button danger fit-button" type="submit">
                            Delete Store
                          </button>
                        </form>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStores.length === 0 && (
                <tr>
                  <td colSpan={7}><small>No stores found.</small></td>
                </tr>
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
                {attempts.length === 0 && (
                  <tr>
                    <td colSpan={4}><small>No login attempts yet.</small></td>
                  </tr>
                )}
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
                {actions.length === 0 && (
                  <tr>
                    <td colSpan={3}><small>No actions yet.</small></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
