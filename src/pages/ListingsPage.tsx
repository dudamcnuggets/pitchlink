import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

type RoleView = 'player' | 'manager'

const ListingsPage = () => {
    const [roleView, setRoleView] = useState<RoleView>('player')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <main className="app-page listings-page">
            <section className="app-hero listings-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Create account" ctaTo="/signup" />
                <div className="app-hero-content">
                    <p className="eyebrow">Listings</p>
                    <h1>Track openings by position and status.</h1>
                    <p className="lead-copy">
                        Frontend scaffold for listing creation and discovery workflows, aligned to the listing schema.
                    </p>
                </div>
            </section>

            <section className="app-section role-switcher-shell" aria-label="Role view switcher">
                <p className="section-label">Listings mode</p>
                <div className="role-switcher" role="group" aria-label="Select listings role">
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'player' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('player')}
                    >
                        Player View
                    </button>
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'manager' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('manager')}
                    >
                        Manager View
                    </button>
                </div>
            </section>

            <section className="app-section listings-page-grid" aria-label="Listing modules">
                <article className="app-card">
                    <p className="card-kicker">Filters</p>
                    <h3>{roleView === 'player' ? 'Search Open Listings' : 'Filter Your Listings'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'Position, team, and location filters will appear here.'
                            : 'Status, position, and team-level filters will appear here.'}
                    </p>
                    <div className="empty-slot">No filters configured yet.</div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Actions</p>
                    <h3>{roleView === 'player' ? 'Apply to listing' : 'Create listing'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'Application entry points will be wired once backend endpoints are available.'
                            : 'Listing creation form and publish controls are scaffold targets.'}
                    </p>
                    <button className="primary-button" type="button" disabled>
                        Coming soon
                    </button>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Listing Board</p>
                    <h3>{roleView === 'player' ? 'Available opportunities' : 'Listings you manage'}</h3>
                    <p>Structured board area for future listing rows tied to team and status.</p>
                    <div className="empty-slot">Listing cards will appear here.</div>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Need personalized matching?"
                linkLabel="Open For You"
                linkTo="/for-you"
            />
        </main>
    )
}

export default ListingsPage
