import type { ReactNode } from 'react'
import { createContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getActiveSession, subscribeToAuthStateChanges } from '../services/auth'
import type { UserRole } from '../services/auth'
import { getCurrentUserRole } from '../services/profile'

type AuthContextValue = {
    session: Session | null
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    userRole: UserRole | null
    isRoleLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [userRole, setUserRole] = useState<UserRole | null>(null)
    const [isRoleLoading, setIsRoleLoading] = useState(false)

    useEffect(() => {
        let isMounted = true

        const hydrateRole = async (nextSession: Session | null) => {
            if (!isMounted) {
                return
            }

            if (!nextSession?.user) {
                setUserRole(null)
                setIsRoleLoading(false)
                return
            }

            setIsRoleLoading(true)

            const roleResult = await getCurrentUserRole()

            if (!isMounted) {
                return
            }

            setUserRole(roleResult.ok ? roleResult.role ?? null : null)
            setIsRoleLoading(false)
        }

        const loadSession = async () => {
            const activeSession = await getActiveSession()

            if (!isMounted) {
                return
            }

            setSession(activeSession)
            void hydrateRole(activeSession)
            setIsLoading(false)
        }

        void loadSession()

        const subscription = subscribeToAuthStateChanges((_event, nextSession) => {
            if (!isMounted) {
                return
            }

            setSession(nextSession)
            void hydrateRole(nextSession)
            setIsLoading(false)
        })

        return () => {
            isMounted = false
            subscription?.unsubscribe()
        }
    }, [])

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            isLoading,
            isAuthenticated: Boolean(session?.user),
            userRole,
            isRoleLoading,
        }),
        [isLoading, isRoleLoading, session, userRole],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
