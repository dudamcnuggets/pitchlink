import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

type AuthPayload = {
    email: string
    password: string
}

export type UserRole = 'player' | 'manager'

type SignUpPayload = AuthPayload & {
    role: UserRole
}

type AuthResult = {
    ok: boolean
    message?: string
    requiresEmailVerification?: boolean
}

const missingConfigMessage =
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

export const signInWithEmail = async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const signUpWithEmail = async ({ email, password, role }: SignUpPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/complete-profile`,
            data: {
                role,
            },
        },
    })

    if (error) {
        return { ok: false, message: error.message }
    }

    const requiresEmailVerification = !data.session

    return {
        ok: true,
        requiresEmailVerification,
        message: requiresEmailVerification
            ? 'Check your email to verify your account. After verification, sign in and complete your profile.'
            : 'Account created successfully.',
    }
}
