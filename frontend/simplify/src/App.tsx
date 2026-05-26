import { Navigate, Route, Routes } from 'react-router-dom';
import { DEFAULT_VERSION } from './config';
import { VersionPlaceholder, VersionsPage, versionPath } from './router';
import V1Page from './pages/v1/V1Page';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={versionPath(DEFAULT_VERSION)} replace />} />
      <Route path="/versions" element={<VersionsPage />} />
      <Route path="/v1" element={<V1Page />} />
      <Route path="/v1-1" element={<VersionPlaceholder versionId="v1-1" />} />
      <Route path="*" element={<Navigate to={versionPath(DEFAULT_VERSION)} replace />} />
    </Routes>
  );
}
