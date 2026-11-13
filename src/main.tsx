import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes, useParams } from 'react-router-dom'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './index.css'
import Layout from './components/Layout'
import AdminGate from './components/AdminGate'
import { seedIfEmpty, upgradeCompanyName } from './lib/db'
import { askPersistentStorage } from './lib/backup'
import Dashboard from './pages/Dashboard'
import DocsList from './pages/DocsList'
import DocEdit from './pages/DocEdit'
import Chantiers from './pages/Chantiers'
import ChantierDetail from './pages/ChantierDetail'
import Clients from './pages/Clients'
import Catalogue from './pages/Catalogue'
import Employes from './pages/Employes'
import PointagePage from './pages/Pointage'
import FraisPage from './pages/Frais'
import Parametres from './pages/Parametres'
import Sauvegarde from './pages/Sauvegarde'
import Corbeille from './pages/Corbeille'
import Archives from './pages/Archives'
import { startSync } from './lib/sync'

/** Chaque document a son propre éditeur : rien ne reste de l'écran précédent. */
function DocEditRoute() {
  const { id } = useParams()
  return <DocEdit key={id} />
}

void askPersistentStorage()
void seedIfEmpty().then(upgradeCompanyName).then(startSync)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter : fonctionne même ouvert sans serveur, toutes les pages restent accessibles hors ligne */}
    <AdminGate>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="documents/:type" element={<DocsList />} />
          <Route path="documents/:type/:id" element={<DocEditRoute />} />
          <Route path="chantiers" element={<Chantiers />} />
          <Route path="chantiers/:id" element={<ChantierDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="employes" element={<Employes />} />
          <Route path="pointage" element={<PointagePage />} />
          <Route path="frais" element={<FraisPage />} />
          <Route path="parametres" element={<Parametres />} />
          <Route path="sauvegarde" element={<Sauvegarde />} />
          <Route path="corbeille" element={<Corbeille />} />
          <Route path="archives" element={<Archives />} />
        </Route>
      </Routes>
    </HashRouter>
    </AdminGate>
  </StrictMode>,
)
