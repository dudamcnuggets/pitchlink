import { useCallback, useEffect, useMemo, useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { useAuth } from '../context/useAuth'
import { getCurrentManagerListings, listListings, type Listing } from '../services/listing'
import { getCurrentProfile } from '../services/profile'
import { getCurrentManagerTeams, listTeams, type Team } from '../services/team'

type Recommendation = {
    listing: Listing
    score: number
    reasons: string[]
}

const normalizeValue = (value: string) => value.trim().toLowerCase()

const splitPositions = (value: string) =>
    value
        .split(',')
        .map((position) => normalizeValue(position))
        .filter((position) => position.length > 0)

const ForYouPage = () => {
    const { userRole, isRoleLoading } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [visibleListings, setVisibleListings] = useState<Listing[]>([])
    const [visibleTeams, setVisibleTeams] = useState<Team[]>([])
    const [profilePositionText, setProfilePositionText] = useState('')

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

    const buildPlayerRecommendations = useCallback((listings: Listing[], teams: Team[], positionText: string) => {
        const teamMap = teams.reduce<Record<string, Team>>((accumulator, team) => {
            accumulator[team.id] = team
            return accumulator
        }, {})

        const preferredPositions = splitPositions(positionText)

        const scoredRecommendations = listings
            .map<Recommendation>((listing) => {
                const reasons: string[] = []
                let score = 0

                const listingPosition = normalizeValue(listing.position)
                const hasPositionPreference = preferredPositions.length > 0
                const isPositionMatch = preferredPositions.some((position) => listingPosition.includes(position))

                if (isPositionMatch) {
                    score += 55
                    reasons.push('Position match')
                } else if (!hasPositionPreference) {
                    score += 30
                    reasons.push('No position preference set yet')
                } else {
                    score += 10
                }

                if (normalizeValue(listing.status) === 'open') {
                    score += 25
                    reasons.push('Currently open')
                }

                if (listing.description.trim().length >= 60) {
                    score += 10
                    reasons.push('Detailed listing description')
                }

                const team = teamMap[listing.teamId]
                if (team?.location) {
                    score += 5
                    reasons.push('Team location published')
                }

                return {
                    listing,
                    score: Math.min(100, score),
                    reasons,
                }
            })
            .sort((left, right) => right.score - left.score)

        return scoredRecommendations
    }, [])

    const loadRecommendations = useCallback(async () => {
        setIsLoading(true)
        setStatusMessage(null)
        setStatusType(null)

        if (isManagerView) {
            const [managerTeamsResult, managerListingsResult] = await Promise.all([
                getCurrentManagerTeams(),
                getCurrentManagerListings(),
            ])

            if (!managerTeamsResult.ok || !managerListingsResult.ok) {
                setStatusType('error')
                setStatusMessage(
                    managerTeamsResult.message ??
                    managerListingsResult.message ??
                    'Unable to load manager recommendations.',
                )
                setVisibleTeams([])
                setVisibleListings([])
                setRecommendations([])
                setIsLoading(false)
                return
            }

            const managerTeams = managerTeamsResult.teams ?? []
            const managerListings = managerListingsResult.listings ?? []

            setVisibleTeams(managerTeams)
            setVisibleListings(managerListings)
            setRecommendations(
                managerListings.map((listing) => {
                    const reasons: string[] = []
                    let score = 40

                    if (normalizeValue(listing.status) === 'open') {
                        score += 30
                        reasons.push('Listing is active')
                    }

                    if (listing.position.trim().length > 0) {
                        score += 15
                        reasons.push('Position specified')
                    }

                    if (listing.description.trim().length >= 80) {
                        score += 15
                        reasons.push('Description is detailed')
                    }

                    return {
                        listing,
                        score: Math.min(100, score),
                        reasons,
                    }
                }),
            )
            setProfilePositionText('')
            setIsLoading(false)
            return
        }

        const [profileResult, listingsResult, teamsResult] = await Promise.all([
            getCurrentProfile(),
            listListings({ status: 'open' }),
            listTeams(),
        ])

        if (!profileResult.ok || !profileResult.profile || !listingsResult.ok || !teamsResult.ok) {
            setStatusType('error')
            setStatusMessage(
                profileResult.message ?? listingsResult.message ?? teamsResult.message ?? 'Unable to load recommendations.',
            )
            setVisibleTeams([])
            setVisibleListings([])
            setRecommendations([])
            setIsLoading(false)
            return
        }

        const openListings = listingsResult.listings ?? []
        const teams = teamsResult.teams ?? []
        const positionText = profileResult.profile.position

        setVisibleListings(openListings)
        setVisibleTeams(teams)
        setProfilePositionText(positionText)
        setRecommendations(buildPlayerRecommendations(openListings, teams, positionText))
        setIsLoading(false)
    }, [buildPlayerRecommendations, isManagerView])

    useEffect(() => {
        if (isRoleLoading) {
            return
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadRecommendations()
    }, [isRoleLoading, loadRecommendations])

    const topRecommendations = recommendations.slice(0, 8)

    return (
        <main className="app-page foryou-page">
            <section className="app-hero foryou-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Profile" ctaTo="/profile" />
                <div className="app-hero-content">
                    <p className="eyebrow">For You</p>
                    <h1>Personalized fit and priority insights.</h1>
                    <p className="lead-copy">
                        MVP recommendation mode is now live with deterministic relevance ranking.
                    </p>
                </div>
            </section>

            <section className="app-section foryou-page-grid" aria-label="Recommendation modules">
                {statusMessage && <p className={`auth-helper-text ${statusType === 'error' ? 'error' : ''}`}>{statusMessage}</p>}

                <article className="app-card">
                    <p className="card-kicker">Match Signals</p>
                    <h3>{isManagerView ? 'Listing quality highlights' : 'Best fit listings'}</h3>

                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading recommendation signals...</div>
                    ) : (
                        <div className="empty-slot">
                            <strong>{recommendations.length}</strong> recommendation signals generated
                            {!isManagerView && profilePositionText.length > 0 && (
                                <>
                                    {' '}
                                    from profile positions: <strong>{profilePositionText}</strong>
                                </>
                            )}
                        </div>
                    )}
                </article>

                <article className="app-card">
                    <p className="card-kicker">Priorities</p>
                    <h3>{isManagerView ? 'Your listing gaps' : 'Your profile gaps'}</h3>
                    <p>
                        {isManagerView
                            ? 'Prioritize listings missing position or rich description to improve applicant quality.'
                            : 'Set complete position details in profile to strengthen recommendation quality.'}
                    </p>
                    <div className="empty-slot">
                        {isManagerView
                            ? `${visibleListings.filter((listing) => listing.position.trim().length === 0).length} listings missing positions`
                            : profilePositionText.trim().length === 0
                                ? 'Add at least one preferred position in profile.'
                                : 'Profile position preferences are configured.'}
                    </div>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Recommendations</p>
                    <h3>{isManagerView ? 'Suggested listing improvements' : 'Suggested teams and listings'}</h3>
                    <p>
                        Rankings are deterministic for MVP: position alignment, listing openness, and listing completeness.
                    </p>

                    {isRoleLoading || isLoading ? (
                        <div className="empty-slot">Loading recommendations...</div>
                    ) : topRecommendations.length === 0 ? (
                        <div className="empty-slot">No recommendations available yet.</div>
                    ) : (
                        <div className="listing-board">
                            {topRecommendations.map((item) => {
                                const team = teamLookup[item.listing.teamId]

                                return (
                                    <article className="listing-entry" key={item.listing.id}>
                                        <header className="listing-entry-header">
                                            <p className="listing-team">{team?.name ?? 'Unknown Team'}</p>
                                            <p className="listing-applicants">Score {item.score}%</p>
                                        </header>
                                        <h4>{item.listing.position || 'Position pending'}</h4>
                                        <p>{item.listing.description || 'Description pending'}</p>
                                        <p>{item.reasons.join(' • ')}</p>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Ready to manage your submissions?"
                linkLabel="Go to applications"
                linkTo="/applications"
            />
        </main>
    )
}

export default ForYouPage
