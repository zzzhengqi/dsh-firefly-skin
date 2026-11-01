/**
 * Firefly skin — host half.
 *
 * The browser bundle owns everything visible; this half only paints the
 * document canvas dark before the client plugin materializes, so the first
 * frame of a page load never flashes the stock light background.
 */

const CANVAS = [
  'html{background:#04080d}',
  'body{background:#04080d}'
].join('')

// Runs before the application module: owns the dark palette from the first
// frame, so a cold start never flashes the stock light theme.
const PALETTE = `(() => {
  document.documentElement.classList.add('ff-skin')
  document.documentElement.style.colorScheme = 'dark'
  document.body.setAttribute('data-ds-dark-theme', '')
})()`

/**
 * Inject the pre-paint canvas colour and palette selector into every index response.
 * @param {import('@deepseek-ai/cordis').Context} ctx host context
 */
export function apply(ctx) {
  ctx.on('webserver/index-inject', (rows) => {
    rows.push({ kind: 'style', text: CANVAS })
    rows.push({ kind: 'script', placement: 'body', text: PALETTE })
  })
}
