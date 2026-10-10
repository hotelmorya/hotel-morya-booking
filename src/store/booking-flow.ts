import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uuid } from '@/lib/uuid'

export type FlowStep = 'dates' | 'rooms' | 'guest' | 'payment' | 'success'

export interface GuestFormData {
  fullname: string
  phone: string
  email?: string
  city?: string
  preferred_language: string
  special_requests?: string
}

export interface BookingFlowState {
  step: FlowStep
  checkIn: string
  checkOut: string
  guests: number
  quantities: Record<string, number>
  sessionId: string
  holdExpiry: number | null
  guestData: GuestFormData | null
  // actions
  setStep: (step: FlowStep) => void
  setDates: (ci: string, co: string, g: number) => void
  setQuantities: (q: Record<string, number>) => void
  setHoldExpiry: (exp: number | null) => void
  setGuestData: (d: GuestFormData | null) => void
  reset: () => void
}

const initialState = {
  step: 'dates' as FlowStep,
  checkIn: '',
  checkOut: '',
  guests: 2,
  quantities: {} as Record<string, number>,
  sessionId: uuid(),
  holdExpiry: null as number | null,
  guestData: null as GuestFormData | null,
}

export const useBookingFlow = create<BookingFlowState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setDates: (checkIn, checkOut, guests) => set({ checkIn, checkOut, guests }),
      setQuantities: (quantities) => set({ quantities }),
      setHoldExpiry: (holdExpiry) => set({ holdExpiry }),
      setGuestData: (guestData) => set({ guestData }),
      reset: () => set({ ...initialState, sessionId: uuid() }),
    }),
    {
      name: 'hotel-morya-booking-flow',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        step: s.step === 'success' ? ('dates' as FlowStep) : s.step,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        guests: s.guests,
        quantities: s.quantities,
        sessionId: s.sessionId,
        holdExpiry: s.holdExpiry,
        guestData: s.guestData,
      }),
      onRehydrateStorage: () => (state) => {
        // If the 5-minute hold expired while user was away, reset to rooms
        if (state && state.holdExpiry && state.holdExpiry < Date.now()) {
          state.holdExpiry = null
          if (state.step === 'guest') {
            state.step = 'rooms'
          }
        }
      },
    }
  )
)
