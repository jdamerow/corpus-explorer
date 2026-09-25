import { defineConfig } from 'vite';

function getBasePath() {
  const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? 'corpus-explorer/').split('/');
  if (!owner || !repository || repository === `${owner}.github.io`) return '/';
  return `/${repository}/`;
}

export default defineConfig({
  base: getBasePath(),
});