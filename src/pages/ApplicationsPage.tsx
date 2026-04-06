import { useCallback, useEffect, useMemo, useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { useAuth } from '../context/useAuth'
import {
    listCurrentManagerIncomingApplications,
    listCurrentPlayerApplications,
    updateApplicationStatus,
    withdrawCurrentPlayerApplication,
    type Application,
} from '../services/application'
import { listTeams, type Team } from '../services/team'

const ApplicationsPage = () => {
    const { userRole, isRoleLoading } = useAuth()
    const [applications, setApplications] = useState<Application[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [isSavingId, setIsSavingId] = useState<string | null>(null)

    const resolvedRole = userRole ?? 'player'
    const isManagerView = resolvedRole === 'manager'

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    const teamLookup = useMemo(() => {
        return teams.reduce<Record<string, Team>>((accumulator, team) => {
            accumulator[team.id] = team
            return accumulator
        }, {})
    }, [teams])

    const normalizeStatus = (status: string) => status.trim().toLowerCase()

    const pendingStatuses = new Set(['pending', 'submitted', 'in_review'])
    const acceptedStatuses = new Set(['accepted'])
    const declinedStatuses = new Set(['declined', 'rejected'])

    const pendingApplications = applications.filter((application) => pendingStatuses.has(normalizeStatus(application.status)))
    const acceptedApplications = applications.filter((application) => acceptedStatuses.has(normalizeStatus(application.status)))
    const declinedApplications = applications.filter((application) => declinedStatuses.has(normalizeStatus(application.status)))

    const loadApplications = useCallback(async () => {
        setIsLoading(true)
        setStatusMessage(null)
        setStatusType(null)

        const [applicationsResult, teamsResult] = await Promise.all([
            isManagerView ? listCurrentManagerIncomingApplications() : listCurrentPlayerApplications(),
            listTeams(),
        ])

        if (!teamsResult.ok) {
            setTeams([])
        } else {
            setTeams(teamsResult.teams ?? [])
        }

        if (!applicationsResult.ok) {
            setStatusType('error')
            setStatusMessage(applicationsResult.message ?? 'Unable to load applications right now.')
            setApplications([])
            setIsLoading(false)
            return
        }

        setApplications(applicationsResult.applications ?? [])
        setIsLoading(false)
    }, [isManagerView])

    useEffect(() => {
        if (isRoleLoading) {
            return
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadApplications()
    }, [isRoleLoading, loadApplications])

    const handleUpdateStatus = async (applicationId: string, status: string) => {
        setIsSavingId(applicationId)
        setStatusMessage(null)
        setStatusType(null)

        const result = await updateApplicationStatus(applicationId, status)

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to update application status.')
            setIsSavingId(null)
            return
        }

        setStatusType('success')
        setStatusMessage(`Application marked as ${status}.`)
        await loadApplications()
        setIsSavingId(null)
    }

    const handleWithdraw = async (applicationId: string) => {
        setIsSavingId(applicationId)
        setStatusMessage(null)
        setStatusType(null)

        const result = await withdrawCurrentPlayerApplication(applicationId)

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to withdraw application.')
            setIsSavingId(null)
            return
        }

        setStatusType('success')
        setStatusMessage('Application withdrawn.')
        await loadApplications()
        setIsSavingId(null)
    }

    const renderApplicationCard = (application: Application) => {
        const team = teamLookup[application.teamId]

        return (
            <article className="listing-entry" key={application.id}>
                <header className="listing-entry-header">
                    <p className="listing-team">{team?.name ?? 'Unknown Team'}</p>
                    <p className="listing-applicants">{application.status}</p>
                </header>
                <p>{application.message || 'No message provided.'}</p>

                {isManagerView ? (
                    <div className="role-switcher" role="group" aria-label="Manager decision actions">
                        <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleUpdateStatus(application.id, 'accepted')}
                            disabled={isSavingId === application.id}
                        >
                            Accept
                        </button>
                        <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleUpdateStatus(application.id, 'declined')}
                            disabled={isSavingId === application.id}
                        >
                            Decline
                        </button>
                    </div>
                ) : (
                    <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleWithdraw(application.id)}
                        disabled={isSavingId === application.id}
                    >
                        {isSavingId === application.id ? 'Processing...' : 'Withdraw'}
                    </button>
                )}
            </article>
        )
    }

    return (
        <main className="app-page applications-page">
            <section className="app-hero applications-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Profile" ctaTo="/profile" />
                <div className="app-hero-content">
                    <p className="eyebrow">Applications</p>
                    <h1>Track statuses and decision flow.</h1>
                    <p className="lead-copy">
                        {isManagerView
                            ? 'Review incoming applications for your teams and send decisions.'
                            : 'Track your submitted applications and monitor decisions from teams.'}
                    </p>
                </div>
            </section>

            <section className="app-section applications-page-grid" aria-label="Application status modules">
                {statusMessage && <p className={`auth-helper-text ${statusType === 'error' ? 'error' : ''}`}>{statusMessage}</p>}

                <article className="app-card">
                    <p className="card-kicker">Pending</p>
                    <h3>{isManagerView ? 'Awaiting your review' : 'Awaiting team response'}</h3>
                    <div className="status-chip pending">Pending</div>
                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading pending applications...</div>
                    ) : pendingApplications.length === 0 ? (
                        <div className="empty-slot">No pending applications yet.</div>
                    ) : (
                        <div className="listing-board">{pendingApplications.map(renderApplicationCard)}</div>
                    )}
                </article>

                <article className="app-card">
                    <p className="card-kicker">Accepted</p>
                    <h3>{isManagerView ? 'Accepted players' : 'Successful applications'}</h3>
                    <div className="status-chip accepted">Accepted</div>
                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading accepted applications...</div>
                    ) : acceptedApplications.length === 0 ? (
                        <div className="empty-slot">No accepted applications yet.</div>
                    ) : (
                        <div className="listing-board">{acceptedApplications.map(renderApplicationCard)}</div>
                    )}
                </article>

                <article className="app-card">
                    <p className="card-kicker">Declined</p>
                    <h3>{isManagerView ? 'Declined candidates' : 'Declined submissions'}</h3>
                    <div className="status-chip declined">Declined</div>
                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading declined applications...</div>
                    ) : declinedApplications.length === 0 ? (
                        <div className="empty-slot">No declined applications yet.</div>
                    ) : (
                        <div className="listing-board">{declinedApplications.map(renderApplicationCard)}</div>
                    )}
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Messages</p>
                    <h3>{isManagerView ? 'Decision notes to players' : 'Application notes to teams'}</h3>
                    <p>
                        Messaging thread is still deferred, but notes are visible inside each application card and status lanes
                        are fully live.
                    </p>
                    <div className="empty-slot">Total applications in view: {applications.length}</div>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Want to revisit opportunities?"
                linkLabel="Browse listings"
                linkTo="/listings"
            />
        </main>
    )
}

export default ApplicationsPage
