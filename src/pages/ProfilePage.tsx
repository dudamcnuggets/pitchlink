import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

type RoleView = 'player' | 'manager'

const ProfilePage = () => {
    const [roleView, setRoleView] = useState<RoleView>('player')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <main className="app-page profile-page">
            <section className="app-hero profile-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">Profile</p>
                    <h1>Build your role-based identity.</h1>
                    <p className="lead-copy">
                        UI scaffold for both player and manager profiles. Data fields are visual placeholders only.
                    </p>
                </div>
            </section>

            <section className="app-section role-switcher-shell" aria-label="Role view switcher">
                <p className="section-label">Profile mode</p>
                <div className="role-switcher" role="group" aria-label="Select profile role">
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'player' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('player')}
                    >
                        Player Profile
                    </button>
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'manager' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('manager')}
                    >
                        Manager Profile
                    </button>
                </div>
            </section>

            <section className="app-section profile-page-grid" aria-label="Profile modules">
                <article className="app-card">
                    <p className="card-kicker">Core Fields</p>
                    <h3>User Identity</h3>
                    <ul className="field-list">
                        <li>Name</li>
                        <li>Email</li>
                        <li>Role</li>
                        <li>User ID</li>
                    </ul>
                </article>

                {roleView === 'player' ? (
                    <article className="app-card">
                        <p className="card-kicker">Player Fields</p>
                        <h3>Player Details</h3>
                        <ul className="field-list">
                            <li>Birthday</li>
                            <li>Position</li>
                            <li>Height</li>
                            <li>Bio</li>
                            <li>Highlight URL</li>
                        </ul>
                    </article>
                ) : (
                    <article className="app-card">
                        <p className="card-kicker">Manager Fields</p>
                        <h3>Manager Details</h3>
                        <ul className="field-list">
                            <li>Managed Team Count</li>
                            <li>Primary League</li>
                            <li>Location Focus</li>
                            <li>Recruitment Priorities</li>
                        </ul>
                    </article>
                )}

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Editor</p>
                    <h3>{roleView === 'player' ? 'Player profile editor' : 'Manager profile editor'}</h3>
                    <p>This area is reserved for editable form controls in a later frontend/backend pass.</p>
                    <button className="primary-button" type="button" disabled>
                        Save changes (coming soon)
                    </button>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Want to browse open opportunities next?"
                linkLabel="View listings"
                linkTo="/listings"
            />
        </main>
    )
}

export default ProfilePage
