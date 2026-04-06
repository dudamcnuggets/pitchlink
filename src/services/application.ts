import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'

type ApplicationRow = {
    id: string
    status: string
    message: string | null
    player_id: string
    team_id: string
    created_at: string
}

export type Application = {
    id: string
    status: string
    message: string
    playerId: string
    teamId: string
    createdAt: string
}

export type ApplicationCreatePayload = {
    teamId: string
    message?: string
}

type ApplicationResult = {
    ok: boolean
    message?: string
    application?: Application
}

type ApplicationListResult = {
    ok: boolean
    message?: string
    applications?: Application[]
}

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const mapApplicationRow = (row: ApplicationRow): Application => ({
    id: row.id,
    status: row.status,
    message: row.message ?? '',
    playerId: row.player_id,
    teamId: row.team_id,
    createdAt: row.created_at,
})

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
}

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

const getManagerTeamIds = async (managerId: string): Promise<{ ok: boolean; teamIds?: string[]; message?: string }> => {
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

export const submitApplication = async ({ teamId, message }: ApplicationCreatePayload): Promise<ApplicationResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { userId, message: authMessage } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: authMessage ?? 'Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('application')
        .insert({
            status: 'submitted',
            message: normalizeText(message),
            team_id: teamId,
            player_id: userId,
        })
        .select('id, status, message, player_id, team_id, created_at')
        .single<ApplicationRow>()

    if (error) {
        if (error.code === '23505') {
            return { ok: false, message: 'You already applied to this team.' }
        }

        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        application: mapApplicationRow(data),
    }
}

export const listCurrentPlayerApplications = async (): Promise<ApplicationListResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('application')
        .select('id, status, message, player_id, team_id, created_at')
        .eq('player_id', userId)
        .order('created_at', { ascending: false })
        .returns<ApplicationRow[]>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, applications: (data ?? []).map(mapApplicationRow) }
}

export const listCurrentManagerIncomingApplications = async (): Promise<ApplicationListResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    const managedTeamsResult = await getManagerTeamIds(userId)

    if (!managedTeamsResult.ok) {
        return { ok: false, message: managedTeamsResult.message }
    }

    const teamIds = managedTeamsResult.teamIds ?? []
    if (teamIds.length === 0) {
        return { ok: true, applications: [] }
    }

    const { data, error } = await supabase
        .from('application')
        .select('id, status, message, player_id, team_id, created_at')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .returns<ApplicationRow[]>()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true, applications: (data ?? []).map(mapApplicationRow) }
}

export const updateApplicationStatus = async (applicationId: string, status: string): Promise<ApplicationResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const normalizedStatus = status.trim()
    if (normalizedStatus.length === 0) {
        return { ok: false, message: 'Application status is required.' }
    }

    const { data, error } = await supabase
        .from('application')
        .update({ status: normalizedStatus })
        .eq('id', applicationId)
        .select('id, status, message, player_id, team_id, created_at')
        .maybeSingle<ApplicationRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    if (!data) {
        return { ok: false, message: 'Application not found or you do not have permission to edit it.' }
    }

    return { ok: true, application: mapApplicationRow(data) }
}

export const withdrawCurrentPlayerApplication = async (applicationId: string): Promise<{ ok: boolean; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { userId, message } = await getCurrentUserId()

    if (!userId) {
        return { ok: false, message: message ?? 'Sign in to continue.' }
    }

    const { error } = await supabase.from('application').delete().eq('id', applicationId).eq('player_id', userId)

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
