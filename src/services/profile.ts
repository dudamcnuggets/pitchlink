import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
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

const missingConfigMessage =
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
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

    const normalizedHeight = normalizeText(height)

    const profileRow: Record<string, string | number | null> = {
        user_id: user.id,
        role,
    }

    if (role === 'player') {
        profileRow.birthday = normalizeText(birthday)
        profileRow.position = normalizeText(position)
        profileRow.height = normalizedHeight ? Number(normalizedHeight) : null
        profileRow.bio = normalizeText(bio)
        profileRow.video_url = normalizeText(videoUrl)
    }

    const { error } = await supabase.from('profile').upsert(profileRow, { onConflict: 'user_id' })

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
