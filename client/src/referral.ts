import { ethers } from 'ethers'

const REF_STORAGE_KEY = 'expoin-referrer'

function parseRefFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/r\/(0x[a-fA-F0-9]{40})$/)
  return m ? m[1] : null
}

function safeSetReferrer(addr: string) {
  try {
	localStorage.setItem(REF_STORAGE_KEY, addr)
  } catch {}
}

export function initReferralCapture() {
  const ref = parseRefFromPath(window.location.pathname)
  if (!ref) return

  if (!ethers.isAddress(ref)) return

  safeSetReferrer(ref)

  try {
	window.history.replaceState(null, '', '/')
  } catch {}

  setTimeout(() => {
	try {
	  window.location.replace('/')
	} catch {
	  window.location.href = '/'
	}
  }, 50)
}

export function getStoredReferrer(): string {
  try {
	return localStorage.getItem(REF_STORAGE_KEY) || ''
  } catch {
	return ''
  }
}
