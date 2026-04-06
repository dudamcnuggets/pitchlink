import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'

type TeamRow = {
    id: string
    name: string
    league: string | null
    location: string | null
    url: string | null
    manager_id: string
    created_at: string
}

export type Team = {
    id: string
    name: string
    league: string
    location: string
    url: string
    managerId: string
    createdAt: string
}

type TeamResult = {
    ok: boolean
    message?: string
    team?: Team
}

type TeamListResult = {
    ok: boolean
    message?: string
    teams?: Team[]
}

export type TeamFilters = {
    managerId?: string
    league?: string
    location?: string
    searchTerm?: string
}

export type TeamCreatePayload = {
    name: string
    league?: string
    location?: string
    url?: string
}

export type TeamUpdatePayload = {
    name?: string
    league?: string
    location?: string
    url?: string
}

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
}

const mapTeamRow = (row: TeamRow): Team => ({
    id: row.id,
    name: row.name,
    league: row.league ?? '',
    location: row.location ?? '',
    url: row.url ?? '',
    managerId: row.manager_id,
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

export const listTeams = async (filters?: TeamFilters): Promise<TeamListResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    let query = supabase.from('team').select('id, name, league, location, url, manager_id, created_at').order('created_at', { ascending: false })

    if (filters?.managerId) {
        query = query.eq('manager_id', filters.managerId)
    }

    if (filters?.league) {
        query = query.ilike('league', `%${filters.league.trim()}%`)
    }

    if (filters?.location) {
        query = query.ilike('location', `%${filters.location.trim()}%`)
    }

    const normalizedSearchTerm = filters?.searchTerm?.trim()
    if (normalizedSearchTerm) {
        query = query.or(`name.ilike.%${normalizedSearchTerm}%,league.ilike.%${normalizedSearchTerm}%,location.ilike.%${normalizedSearchTerm}%`)
    }

    const { data, error } = await query.returns<TeamRow[]>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, teams: (data ?? []).map(mapTeamRow) }
}

export const getTeamById = async (teamId: string): Promise<TeamResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase
        .from('team')
        .select('id, name, league, location, url, manager_id, created_at')
        .eq('id', teamId)
        .maybeSingle<TeamRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    if (!data) {
        return { ok: false, message: 'Team not found.' }
    }

    return { ok: true, team: mapTeamRow(data) }
}

export const getCurrentManagerTeams = async (): Promise<TeamListResult> => {
    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    return listTeams({ managerId: userId })
}

export const createTeam = async ({ name, league, location, url }: TeamCreatePayload): Promise<TeamResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const normalizedName = name.trim()
    if (normalizedName.length < 2) {
        return { ok: false, message: 'Team name must be at least 2 characters.' }
    }

    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('team')
        .insert({
            name: normalizedName,
            league: normalizeText(league),
            location: normalizeText(location),
            url: normalizeText(url),
            manager_id: userId,
        })
        .select('id, name, league, location, url, manager_id, created_at')
        .single<TeamRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, team: mapTeamRow(data) }
}

export const updateTeam = async (teamId: string, payload: TeamUpdatePayload): Promise<TeamResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const updatePayload: Record<string, string | null> = {}

    if (payload.name !== undefined) {
        const normalizedName = payload.name.trim()
        if (normalizedName.length < 2) {
            return { ok: false, message: 'Team name must be at least 2 characters.' }
        }

        updatePayload.name = normalizedName
    }

    if (payload.league !== undefined) {
        updatePayload.league = normalizeText(payload.league)
    }

    if (payload.location !== undefined) {
        updatePayload.location = normalizeText(payload.location)
    }

    if (payload.url !== undefined) {
        updatePayload.url = normalizeText(payload.url)
    }

    const { data, error } = await supabase
        .from('team')
        .update(updatePayload)
        .eq('id', teamId)
        .select('id, name, league, location, url, manager_id, created_at')
        .maybeSingle<TeamRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    if (!data) {
        return { ok: false, message: 'Team not found or you do not have access to update it.' }
    }

    return { ok: true, team: mapTeamRow(data) }
}

export const deleteTeam = async (teamId: string): Promise<{ ok: boolean; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.from('team').delete().eq('id', teamId)

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
