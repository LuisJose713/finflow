// Permanent FinFlow Android download endpoint; no APKs or signing keys are stored here.
// Resolve the latest stable release at request time so shared links never change.
const RELEASE_API = 'https://api.github.com/repos/LuisJose713/finflow_android/releases/latest';
const EXPECTED_PREFIX = '/LuisJose713/finflow_android/releases/download/';

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).send('Método no permitido.');
  }

  try {
    const github = await fetch(RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'FinFlow-Android-Download'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!github.ok) throw new Error('Release unavailable');
    const release = await github.json();
    if (release.draft || release.prerelease) throw new Error('Not a stable release');
    const asset = release.assets?.find(file =>
      file.name === 'app-release.apk' && file.state === 'uploaded'
    );
    if (!asset) throw new Error('Release APK missing');
    const destination = new URL(asset.browser_download_url);
    if (destination.protocol !== 'https:' ||
        destination.hostname !== 'github.com' ||
        !destination.pathname.startsWith(EXPECTED_PREFIX) ||
        !destination.pathname.endsWith('/app-release.apk')) {
      throw new Error('Invalid download destination');
    }

    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    return response.redirect(302, destination.toString());
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).send('No pudimos obtener la última APK de FinFlow. Inténtalo de nuevo.');
  }
}
