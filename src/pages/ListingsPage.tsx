import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { useAuth } from '../context/useAuth'
import { submitApplication } from '../services/application'
import { createListing, listListings, type Listing } from '../services/listing'
import { getCurrentManagerTeams, listTeams, type Team } from '../services/team'

const ListingsPage = () => {
    const { userRole, isRoleLoading } = useAuth()
    const [listings, setListings] = useState<Listing[]>([])
    const [visibleTeams, setVisibleTeams] = useState<Team[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isApplying, setIsApplying] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [positionFilterInput, setPositionFilterInput] = useState('')
    const [statusFilterInput, setStatusFilterInput] = useState('')
    const [searchFilterInput, setSearchFilterInput] = useState('')
    const [appliedFilters, setAppliedFilters] = useState({
        position: '',
        status: '',
        searchTerm: '',
    })
    const [teamIdInput, setTeamIdInput] = useState('')
    const [newStatusInput, setNewStatusInput] = useState('open')
    const [newPositionInput, setNewPositionInput] = useState('')
    const [newDescriptionInput, setNewDescriptionInput] = useState('')

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
        return visibleTeams.reduce<Record<string, Team>>((accumulator, team) => {
            accumulator[team.id] = team
            return accumulator
        }, {})
    }, [visibleTeams])

    const loadListings = useCallback(async () => {
        setIsLoading(true)
        setStatusMessage(null)
        setStatusType(null)

        const teamsResult = isManagerView ? await getCurrentManagerTeams() : await listTeams()
        if (!teamsResult.ok) {
            setStatusType('error')
            setStatusMessage(teamsResult.message ?? 'Unable to load team context.')
            setVisibleTeams([])
            setListings([])
            setIsLoading(false)
            return
        }

        const teams = teamsResult.teams ?? []
        setVisibleTeams(teams)

        const listingsResult = await listListings({
            position: appliedFilters.position,
            status: appliedFilters.status,
            searchTerm: appliedFilters.searchTerm,
        })

        if (!listingsResult.ok) {
            setStatusType('error')
            setStatusMessage(listingsResult.message ?? 'Unable to load listings right now.')
            setListings([])
            setIsLoading(false)
            return
        }

        let nextListings = listingsResult.listings ?? []

        if (isManagerView) {
            const managedTeamIds = new Set(teams.map((team) => team.id))
            nextListings = nextListings.filter((listing) => managedTeamIds.has(listing.teamId))
        }

        setListings(nextListings)

        if (isManagerView && teams.length > 0 && teamIdInput.length === 0) {
            setTeamIdInput(teams[0].id)
        }

        setIsLoading(false)
    }, [appliedFilters.position, appliedFilters.searchTerm, appliedFilters.status, isManagerView, teamIdInput.length])

    useEffect(() => {
        if (isRoleLoading) {
            return
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadListings()
    }, [isRoleLoading, loadListings])

    const heading = isManagerView ? 'Create and maintain your recruiting listings.' : 'Track openings by position and status.'
    const leadCopy = isManagerView
        ? 'Publish listing updates for your teams and monitor active recruiting slots.'
        : 'Browse current recruiting opportunities and apply to teams that fit your profile.'

    const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setAppliedFilters({
            position: positionFilterInput.trim(),
            status: statusFilterInput.trim(),
            searchTerm: searchFilterInput.trim(),
        })
    }

    const handleCreateListing = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatusMessage(null)
        setStatusType(null)
        setIsCreating(true)

        const result = await createListing({
            teamId: teamIdInput,
            status: newStatusInput,
            position: newPositionInput,
            description: newDescriptionInput,
        })

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to create listing right now.')
            setIsCreating(false)
            return
        }

        setStatusType('success')
        setStatusMessage('Listing created successfully.')
        setNewPositionInput('')
        setNewDescriptionInput('')
        setNewStatusInput('open')
        await loadListings()
        setIsCreating(false)
    }

    const handleApply = async (teamId: string) => {
        setStatusMessage(null)
        setStatusType(null)
        setIsApplying(teamId)

        const result = await submitApplication({
            teamId,
            message: 'Application submitted from listings board.',
        })

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to submit application.')
            setIsApplying(null)
            return
        }

        setStatusType('success')
        setStatusMessage('Application submitted successfully.')
        setIsApplying(null)
    }

    return (
        <main className="app-page listings-page">
            <section className="app-hero listings-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Profile" ctaTo="/profile" />
                <div className="app-hero-content">
                    <p className="eyebrow">Listings</p>
                    <h1>{heading}</h1>
                    <p className="lead-copy">{leadCopy}</p>
                </div>
            </section>

            <section className="app-section listings-page-grid" aria-label="Listing modules">
                {statusMessage && <p className={`auth-helper-text ${statusType === 'error' ? 'error' : ''}`}>{statusMessage}</p>}

                <article className="app-card">
                    <p className="card-kicker">Filters</p>
                    <h3>{isManagerView ? 'Filter your listings' : 'Find open opportunities'}</h3>

                    <form className="auth-form" onSubmit={handleFilterSubmit}>
                        <label htmlFor="listingPosition">Position</label>
                        <input
                            id="listingPosition"
                            type="text"
                            value={positionFilterInput}
                            onChange={(event) => setPositionFilterInput(event.target.value)}
                        />

                        <label htmlFor="listingStatus">Status</label>
                        <input
                            id="listingStatus"
                            type="text"
                            value={statusFilterInput}
                            onChange={(event) => setStatusFilterInput(event.target.value)}
                            placeholder="open"
                        />

                        <label htmlFor="listingSearch">Search</label>
                        <input
                            id="listingSearch"
                            type="text"
                            value={searchFilterInput}
                            onChange={(event) => setSearchFilterInput(event.target.value)}
                            placeholder="Position or description"
                        />

                        <button className="primary-button" type="submit">
                            Apply Filters
                        </button>
                    </form>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Actions</p>
                    <h3>{isManagerView ? 'Create listing' : 'Apply from board'}</h3>

                    {isManagerView ? (
                        <form className="auth-form" onSubmit={handleCreateListing}>
                            <label htmlFor="listingTeam">Team</label>
                            <select
                                id="listingTeam"
                                value={teamIdInput}
                                onChange={(event) => setTeamIdInput(event.target.value)}
                                required
                            >
                                {visibleTeams.length === 0 && <option value="">No managed teams</option>}
                                {visibleTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="newListingStatus">Status</label>
                            <input
                                id="newListingStatus"
                                type="text"
                                value={newStatusInput}
                                onChange={(event) => setNewStatusInput(event.target.value)}
                                required
                            />

                            <label htmlFor="newListingPosition">Position</label>
                            <input
                                id="newListingPosition"
                                type="text"
                                value={newPositionInput}
                                onChange={(event) => setNewPositionInput(event.target.value)}
                            />

                            <label htmlFor="newListingDescription">Description</label>
                            <textarea
                                id="newListingDescription"
                                rows={4}
                                value={newDescriptionInput}
                                onChange={(event) => setNewDescriptionInput(event.target.value)}
                            />

                            <button
                                className="primary-button"
                                type="submit"
                                disabled={isCreating || visibleTeams.length === 0 || teamIdInput.length === 0}
                            >
                                {isCreating ? 'Creating...' : 'Create Listing'}
                            </button>
                        </form>
                    ) : (
                        <p className="empty-slot">
                            Open a listing card and click Apply to submit your application.
                        </p>
                    )}
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Listing Board</p>
                    <h3>{isManagerView ? 'Listings you manage' : 'Available opportunities'}</h3>
                    <p>{isLoading ? 'Loading listings...' : `${listings.length} listings found for current filters.`}</p>

                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading listing board...</div>
                    ) : listings.length === 0 ? (
                        <div className="empty-slot">No listings found.</div>
                    ) : (
                        <div className="listing-board">
                            {listings.map((listing) => {
                                const team = teamLookup[listing.teamId]

                                return (
                                    <article className="listing-entry" key={listing.id}>
                                        <header className="listing-entry-header">
                                            <p className="listing-team">{team?.name ?? 'Unknown Team'}</p>
                                            <p className="listing-applicants">{listing.status}</p>
                                        </header>
                                        <h4>{listing.position || 'Position pending'}</h4>
                                        <p>{listing.description || 'Description pending'}</p>

                                        {!isManagerView && (
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={() => handleApply(listing.teamId)}
                                                disabled={isApplying === listing.teamId}
                                            >
                                                {isApplying === listing.teamId ? 'Applying...' : 'Apply'}
                                            </button>
                                        )}
                                    </article>
                                )
                            })}
                        </div>
                    )}
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
