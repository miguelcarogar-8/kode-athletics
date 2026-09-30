import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './HomePage'
import { MetconSimulatorPage } from './MetconSimulatorPage'
import { WodCreatePage } from './WodCreatePage'
import { WodDetailPage } from './WodDetailPage'
import { WodsPage } from './WodsPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulador" element={<MetconSimulatorPage />} />
        <Route path="/wods" element={<WodsPage />} />
        <Route path="/wods/nuevo" element={<WodCreatePage />} />
        <Route path="/wods/:wodId" element={<WodDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
