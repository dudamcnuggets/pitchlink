import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { useAuth } from '../context/useAuth'
import { createTeam, getCurrentManagerTeams, listTeams, type Team } from '../services/team'

const TeamsPage = () => {
    const { userRole, isRoleLoading } = useAuth()
    const [teams, setTeams] = useState<Team[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [leagueInput, setLeagueInput] = useState('')
    const [locationInput, setLocationInput] = useState('')
    const [appliedFilters, setAppliedFilters] = useState({
        searchTerm: '',
        league: '',
        location: '',
    })
    const [teamNameInput, setTeamNameInput] = useState('')
    const [teamLeagueInput, setTeamLeagueInput] = useState('')
    const [teamLocationInput, setTeamLocationInput] = useState('')
    const [teamUrlInput, setTeamUrlInput] = useState('')

    const resolvedRole = userRole ?? 'player'
    const isManagerView = resolvedRole === 'manager'

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    const loadTeams = useCallback(async () => {
        setIsLoading(true)
        setStatusMessage(null)
        setStatusType(null)

        const result = isManagerView
            ? await getCurrentManagerTeams()
            : await listTeams({
                searchTerm: appliedFilters.searchTerm,
                league: appliedFilters.league,
                location: appliedFilters.location,
            })

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to load teams right now.')
            setTeams([])
            setIsLoading(false)
            return
        }

        setTeams(result.teams ?? [])
        setIsLoading(false)
    }, [appliedFilters.league, appliedFilters.location, appliedFilters.searchTerm, isManagerView])

    useEffect(() => {
        if (isRoleLoading) {
            return
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadTeams()
    }, [isRoleLoading, loadTeams])

    const heading = isManagerView ? 'Manage your club spaces.' : 'Find the right club environment.'
    const leadCopy = isManagerView
        ? 'Create and maintain your teams so players can discover your recruiting opportunities.'
        : 'Browse teams by league, location, and recruiting activity to find your best fit.'

    const filteredCountLabel = useMemo(() => {
        if (teams.length === 1) {
            return '1 team'
        }

        return `${teams.length} teams`
    }, [teams.length])

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setAppliedFilters({
            searchTerm: searchInput.trim(),
            league: leagueInput.trim(),
            location: locationInput.trim(),
        })
    }

    const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatusMessage(null)
        setStatusType(null)
        setIsCreating(true)

        const result = await createTeam({
            name: teamNameInput,
            league: teamLeagueInput,
            location: teamLocationInput,
            url: teamUrlInput,
        })

        if (!result.ok || !result.team) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to create team right now.')
            setIsCreating(false)
            return
        }

        setStatusType('success')
        setStatusMessage('Team created successfully.')
        setTeamNameInput('')
        setTeamLeagueInput('')
        setTeamLocationInput('')
        setTeamUrlInput('')
        await loadTeams()
        setIsCreating(false)
    }

    return (
        <main className="app-page teams-page">
            <section className="app-hero teams-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Account" ctaTo="/profile" />
                <div className="app-hero-content">
                    <p className="eyebrow">Teams</p>
                    <h1>{heading}</h1>
                    <p className="lead-copy">{leadCopy}</p>
                </div>
            </section>

            <section className="app-section teams-page-grid" aria-label="Teams modules">
                {statusMessage && <p className={`auth-helper-text ${statusType === 'error' ? 'error' : ''}`}>{statusMessage}</p>}

                <article className="app-card">
                    <p className="card-kicker">{isManagerView ? 'Team Builder' : 'Team Search'}</p>
                    <h3>{isManagerView ? 'Create a Team Profile' : 'Filter Team Directory'}</h3>

                    {isManagerView ? (
                        <form className="auth-form" onSubmit={handleCreateTeam}>
                            <label htmlFor="teamName">Team Name</label>
                            <input
                                id="teamName"
                                type="text"
                                value={teamNameInput}
                                onChange={(event) => setTeamNameInput(event.target.value)}
                                required
                            />

                            <label htmlFor="teamLeague">League</label>
                            <input
                                id="teamLeague"
                                type="text"
                                value={teamLeagueInput}
                                onChange={(event) => setTeamLeagueInput(event.target.value)}
                            />

                            <label htmlFor="teamLocation">Location</label>
                            <input
                                id="teamLocation"
                                type="text"
                                value={teamLocationInput}
                                onChange={(event) => setTeamLocationInput(event.target.value)}
                            />

                            <label htmlFor="teamUrl">Team URL</label>
                            <input
                                id="teamUrl"
                                type="url"
                                value={teamUrlInput}
                                onChange={(event) => setTeamUrlInput(event.target.value)}
                                placeholder="https://"
                            />

                            <button className="primary-button" type="submit" disabled={isCreating}>
                                {isCreating ? 'Creating...' : 'Create Team'}
                            </button>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleSearchSubmit}>
                            <label htmlFor="teamSearch">Search</label>
                            <input
                                id="teamSearch"
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Name, league, location"
                            />

                            <label htmlFor="teamLeagueFilter">League</label>
                            <input
                                id="teamLeagueFilter"
                                type="text"
                                value={leagueInput}
                                onChange={(event) => setLeagueInput(event.target.value)}
                            />

                            <label htmlFor="teamLocationFilter">Location</label>
                            <input
                                id="teamLocationFilter"
                                type="text"
                                value={locationInput}
                                onChange={(event) => setLocationInput(event.target.value)}
                            />

                            <button className="primary-button" type="submit">
                                Apply Filters
                            </button>
                        </form>
                    )}
                </article>

                <article className="app-card">
                    <p className="card-kicker">Directory Summary</p>
                    <h3>{isManagerView ? 'Your Teams' : 'Available Teams'}</h3>
                    <p>
                        {isLoading
                            ? 'Loading teams from Supabase...'
                            : `Showing ${filteredCountLabel} for your current view.`}
                    </p>
                    <div className="empty-slot">
                        {isRoleLoading
                            ? 'Resolving your account role...'
                            : isLoading
                                ? 'Loading...'
                                : teams.length === 0
                                    ? isManagerView
                                        ? 'No teams yet. Create your first team profile.'
                                        : 'No teams match these filters yet.'
                                    : `${teams[0].name}${teams[0].league ? ` - ${teams[0].league}` : ''}`}
                    </div>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Directory</p>
                    <h3>{isManagerView ? 'Managed Team List' : 'Team Search Results'}</h3>
                    <p>{isManagerView ? 'Teams where you are the manager.' : 'Teams that match your selected filters.'}</p>

                    {isLoading ? (
                        <div className="empty-slot">Loading team rows...</div>
                    ) : teams.length === 0 ? (
                        <div className="empty-slot">No teams found.</div>
                    ) : (
                        <div className="directory-list" aria-label="Team directory results">
                            {teams.map((team) => (
                                <article className="empty-slot" key={team.id}>
                                    <p><strong>{team.name}</strong></p>
                                    <p>{team.league || 'League pending'}</p>
                                    <p>{team.location || 'Location pending'}</p>
                                    {team.url && (
                                        <a href={team.url} target="_blank" rel="noreferrer">
                                            Open team link
                                        </a>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Need a full manager or player setup?"
                linkLabel="Open profile"
                linkTo="/profile"
            />
        </main>
    )
}

export default TeamsPage
