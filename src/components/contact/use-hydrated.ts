import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False while server-rendering and during hydration, true afterwards. Contact
// uses it to keep the server markup working without JavaScript and to enhance
// it only once the client has taken over.
export function useHydrated() {
	return useSyncExternalStore(subscribe, () => true, () => false)
}
