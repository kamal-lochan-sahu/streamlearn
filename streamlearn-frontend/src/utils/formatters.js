export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`
}

export const formatDate = (date, opts = {}) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts
  })
}

export const formatCurrency = (amount, currency = 'INR') => {
  if (!amount && amount !== 0) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 0
  }).format(amount)
}

export const formatViewCount = (count) => {
  if (!count) return '0 views'
  if (count >= 1e6) return `${(count/1e6).toFixed(1)}M views`
  if (count >= 1e3) return `${(count/1e3).toFixed(1)}K views`
  return `${count} views`
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB'
  if (bytes >= 1e9) return `${(bytes/1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes/1e6).toFixed(1)} MB`
  return `${(bytes/1e3).toFixed(1)} KB`
}

export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

export const timeAgo = (date) => {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600, 'hour'], [60, 'minute']
  ]
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs)
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`
  }
  return 'just now'
}
