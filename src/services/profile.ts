import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'
import type { UserRole } from './auth'

type CompleteProfilePayload = {
    role: UserRole
    birthday?: string
    position?: string
    height?: string
    bio?: string
    videoUrl?: string
}

type CompleteProfileResult = {
    ok: boolean
    message?: string
}

type CurrentUserRoleResult = {
    ok: boolean
    role?: UserRole
    message?: string
}

type IdentityUpdatePayload = {
    fullName: string
    username: string
}

type IdentityUpdateResult = {
    ok: boolean
    message?: string
}

type LegacyProfileRow = {
    role: string | null
    birthday: string | null
    position: string | null
    height: number | null
    bio: string | null
    url: string | null
}

type AppUserRoleRow = {
    role: string | null
}

type AppUserIdentityRow = {
    email: string | null
    name: string | null
    role: string | null
}

type PlayerRow = {
    birthday: string | null
    position: string | null
    height: number | null
    bio: string | null
    url: string | null
}

export type CurrentProfile = {
    userId: string
    email: string
    fullName: string
    username: string
    role: UserRole
    birthday: string
    position: string
    height: string
    bio: string
    videoUrl: string
}

type CurrentProfileResult = {
    ok: boolean
    message?: string
    profile?: CurrentProfile
}

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
}

const parseRole = (value: unknown): UserRole | null => {
    if (value === 'player' || value === 'manager') {
        return value
    }

    return null
}

const buildNameFromEmail = (email: string) => {
    const localPart = email.split('@')[0] ?? ''
    const segments = localPart
        .split(/[._-]+/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)

    if (segments.length === 0) {
        return 'Pitch Link User'
    }

    return segments
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
}

const normalizeUsername = (value: string) => value.trim().toLowerCase()

const getUsernameFromMetadata = (value: unknown) => {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedValue = normalizeUsername(value)
    return normalizedValue.length > 0 ? normalizedValue : null
}

const getNameFromMetadata = (value: unknown) => {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedValue = value.trim()
    return normalizedValue.length > 0 ? normalizedValue : null
}

const toHeightNumber = (height?: string) => {
    const normalizedHeight = normalizeText(height)

    if (!normalizedHeight) {
        return null
    }

    const parsedHeight = Number(normalizedHeight)
    return Number.isFinite(parsedHeight) ? parsedHeight : null
}

export const getCurrentUserRole = async (): Promise<CurrentUserRoleResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, message: 'Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('app_user')
        .select('role')
        .eq('id', user.id)
        .maybeSingle<AppUserRoleRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    const role = parseRole(data?.role) ?? parseRole(user.user_metadata?.role) ?? 'player'
    return { ok: true, role }
}

export const getCurrentProfile = async (): Promise<CurrentProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, message: 'Sign in to view your profile.' }
    }

    const [appUserResult, playerResult, legacyProfileResult] = await Promise.all([
        supabase
            .from('app_user')
            .select('email, name, role')
            .eq('id', user.id)
            .maybeSingle<AppUserIdentityRow>(),
        supabase
            .from('player')
            .select('birthday, position, height, bio, url')
            .eq('user_id', user.id)
            .maybeSingle<PlayerRow>(),
        supabase
            .from('profile')
            .select('role, birthday, position, height, bio, url')
            .eq('user_id', user.id)
            .maybeSingle<LegacyProfileRow>(),
    ])

    if (appUserResult.error || playerResult.error || legacyProfileResult.error) {
        return {
            ok: false,
            message: appUserResult.error?.message ?? playerResult.error?.message ?? legacyProfileResult.error?.message,
        }
    }

    const appUserData = appUserResult.data
    const playerData = playerResult.data
    const legacyProfileData = legacyProfileResult.data

    const role =
        parseRole(appUserData?.role) ?? parseRole(user.user_metadata?.role) ?? parseRole(legacyProfileData?.role) ?? 'player'

    const email = appUserData?.email ?? user.email ?? ''
    const fullName =
        getNameFromMetadata(user.user_metadata?.full_name) ??
        getNameFromMetadata(appUserData?.name) ??
        buildNameFromEmail(email)
    const username = getUsernameFromMetadata(user.user_metadata?.username) ?? normalizeUsername(email.split('@')[0] ?? 'pitchlink')

    const profileSource = role === 'player' ? playerData ?? legacyProfileData : legacyProfileData

    return {
        ok: true,
        profile: {
            userId: user.id,
            email,
            fullName,
            username,
            role,
            birthday: profileSource?.birthday ?? '',
            position: profileSource?.position ?? '',
            height:
                profileSource?.height === null || profileSource?.height === undefined
                    ? ''
                    : String(profileSource.height),
            bio: profileSource?.bio ?? '',
            videoUrl: profileSource?.url ?? '',
        },
    }
}

export const upsertProfile = async ({
    role,
    birthday,
    position,
    height,
    bio,
    videoUrl,
}: CompleteProfilePayload): Promise<CompleteProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, message: 'Sign in to complete your profile.' }
    }

    const normalizedHeight = toHeightNumber(height)

    const { data: appUserData, error: appUserError } = await supabase
        .from('app_user')
        .select('id')
        .eq('id', user.id)
        .maybeSingle<{ id: string }>()

    if (appUserError) {
        return { ok: false, message: appUserError.message }
    }

    if (!appUserData) {
        return {
            ok: false,
            message: 'Account setup is still syncing. Please wait a moment and try again.',
        }
    }

    const { error: roleError } = await supabase.from('app_user').update({ role }).eq('id', user.id)

    if (roleError) {
        return { ok: false, message: roleError.message }
    }

    if (role === 'manager') {
        const { error: managerError } = await supabase
            .from('manager')
            .upsert({ user_id: user.id }, { onConflict: 'user_id' })

        if (managerError) {
            return { ok: false, message: managerError.message }
        }
    }

    if (role === 'player') {
        const { error: playerError } = await supabase.from('player').upsert(
            {
                user_id: user.id,
                birthday: normalizeText(birthday),
                position: normalizeText(position),
                height: normalizedHeight,
                bio: normalizeText(bio),
                url: normalizeText(videoUrl),
            },
            { onConflict: 'user_id' },
        )

        if (playerError) {
            return { ok: false, message: playerError.message }
        }
    }

    const profileRow: Record<string, string | number | null> = {
        user_id: user.id,
        role,
        birthday: null,
        position: null,
        height: null,
        bio: normalizeText(bio),
        url: normalizeText(videoUrl),
    }

    if (role === 'player') {
        profileRow.birthday = normalizeText(birthday)
        profileRow.position = normalizeText(position)
        profileRow.height = normalizedHeight
    }

    const { error } = await supabase.from('profile').upsert(profileRow, { onConflict: 'user_id' })

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const updateProfileIdentity = async ({ fullName, username }: IdentityUpdatePayload): Promise<IdentityUpdateResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const sanitizedName = fullName.trim()
    const sanitizedUsername = normalizeUsername(username)

    if (sanitizedName.length < 2) {
        return { ok: false, message: 'Enter a valid name.' }
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(sanitizedUsername)) {
        return {
            ok: false,
            message: 'Username must be 3-30 chars and only include lowercase letters, numbers, dots, underscores, or hyphens.',
        }
    }

    const { error } = await supabase.auth.updateUser({
        data: {
            full_name: sanitizedName,
            username: sanitizedUsername,
        },
    })

    if (error) {
        return { ok: false, message: 'Unable to update profile identity right now. Please try again.' }
    }

    return { ok: true }
}
