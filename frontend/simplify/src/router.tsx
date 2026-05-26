import { Link } from 'react-router-dom';
import { VERSIONS } from './config';

type VersionId = (typeof VERSIONS)[number]['id'];

export function versionPath(versionId: string): string {
  return VERSIONS.find(version => version.id === versionId)?.path ?? '/v1';
}

export function VersionsPage() {
  return (
    <main className="app-shell">
      <section className="hero-section">
        <p className="eyebrow">Juno Medical Document Simplifier</p>
        <h1>Choose a version</h1>
        <div className="version-list">
          {VERSIONS.map(version => (
            <Link className="glass-card version-card" key={version.id} to={version.path}>
              <span className="version-label">{version.label}</span>
              <span className="version-description">{version.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function VersionPlaceholder({ versionId }: { versionId: VersionId }) {
  const version = VERSIONS.find(item => item.id === versionId);

  return (
    <main className="app-shell">
      <section className="hero-section">
        <p className="eyebrow">Juno Medical Document Simplifier</p>
        <h1>{version?.label ?? versionId}</h1>
        <p className="hero-copy">This version route is ready for the planned page implementation.</p>
        <Link className="secondary-link" to="/versions">
          View all versions
        </Link>
      </section>
    </main>
  );
}
