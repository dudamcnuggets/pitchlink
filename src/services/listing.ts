import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'

type ListingRow = {
    id: string
    status: string
    description: string | null
    position: string | null
    team_id: string
    created_at: string
}

export type Listing = {
    id: string
    status: string
    description: string
    position: string
    teamId: string
    createdAt: string
}

export type ListingFilters = {
    teamId?: string
    position?: string
    status?: string
    searchTerm?: string
    managerId?: string
}

export type ListingCreatePayload = {
    teamId: string
    status: string
    position?: string
    description?: string
}

export type ListingUpdatePayload = {
    status?: string
    position?: string
    description?: string
}

type ListingResult = {
    ok: boolean
    message?: string
    listing?: Listing
}

type ListingListResult = {
    ok: boolean
    message?: string
    listings?: Listing[]
}

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
}

const mapListingRow = (row: ListingRow): Listing => ({
    id: row.id,
    status: row.status,
    description: row.description ?? '',
    position: row.position ?? '',
    teamId: row.team_id,
    createdAt: row.created_at,
})

const getCurrentUserId = async () => {
    if (!isSupabaseConfigured || !supabase) {
        return { userId: null as string | null, message: missingConfigMessage }
    }

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return { userId: null as string | null, message: 'Sign in to continue.' }
    }

    return { userId: user.id, message: null as string | null }
}

const getManagedTeamIds = async (managerId: string): Promise<{ ok: boolean; teamIds?: string[]; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase.from('team').select('id').eq('manager_id', managerId).returns<Array<{ id: string }>>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        teamIds: (data ?? []).map((row) => row.id),
    }
}

export const listListings = async (filters?: ListingFilters): Promise<ListingListResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    let query = supabase
        .from('listing')
        .select('id, status, description, position, team_id, created_at')
        .order('created_at', { ascending: false })

    if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId)
    }

    if (filters?.position) {
        query = query.ilike('position', `%${filters.position.trim()}%`)
    }

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    const normalizedSearchTerm = filters?.searchTerm?.trim()
    if (normalizedSearchTerm) {
        query = query.or(`position.ilike.%${normalizedSearchTerm}%,description.ilike.%${normalizedSearchTerm}%`)
    }

    if (filters?.managerId) {
        const managedTeamsResult = await getManagedTeamIds(filters.managerId)

        if (!managedTeamsResult.ok) {
            return { ok: false, message: managedTeamsResult.message }
        }

        const teamIds = managedTeamsResult.teamIds ?? []
        if (teamIds.length === 0) {
            return { ok: true, listings: [] }
        }

        query = query.in('team_id', teamIds)
    }

    const { data, error } = await query.returns<ListingRow[]>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, listings: (data ?? []).map(mapListingRow) }
}

export const createListing = async ({ teamId, status, position, description }: ListingCreatePayload): Promise<ListingResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const normalizedStatus = status.trim()
    if (normalizedStatus.length === 0) {
        return { ok: false, message: 'Listing status is required.' }
    }

    const { data, error } = await supabase
        .from('listing')
        .insert({
            team_id: teamId,
            status: normalizedStatus,
            position: normalizeText(position),
            description: normalizeText(description),
        })
        .select('id, status, description, position, team_id, created_at')
        .single<ListingRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, listing: mapListingRow(data) }
}

export const updateListing = async (listingId: string, payload: ListingUpdatePayload): Promise<ListingResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const updatePayload: Record<string, string | null> = {}

    if (payload.status !== undefined) {
        const normalizedStatus = payload.status.trim()
        if (normalizedStatus.length === 0) {
            return { ok: false, message: 'Listing status is required.' }
        }

        updatePayload.status = normalizedStatus
    }

    if (payload.position !== undefined) {
        updatePayload.position = normalizeText(payload.position)
    }

    if (payload.description !== undefined) {
        updatePayload.description = normalizeText(payload.description)
    }

    const { data, error } = await supabase
        .from('listing')
        .update(updatePayload)
        .eq('id', listingId)
        .select('id, status, description, position, team_id, created_at')
        .maybeSingle<ListingRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    if (!data) {
        return { ok: false, message: 'Listing not found or you do not have permission to edit it.' }
    }

    return { ok: true, listing: mapListingRow(data) }
}

export const updateListingStatus = async (listingId: string, status: string): Promise<ListingResult> => {
    return updateListing(listingId, { status })
}

export const getCurrentManagerListings = async (): Promise<ListingListResult> => {
    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    return listListings({ managerId: userId })
}

export const deleteListing = async (listingId: string): Promise<{ ok: boolean; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.from('listing').delete().eq('id', listingId)

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
