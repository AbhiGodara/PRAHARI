import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import LiveMap from './pages/LiveMap'
import EventTriage from './pages/EventTriage'
import ConcurrentAllocator from './pages/ConcurrentAllocator'
import PostEventDebrief from './pages/PostEventDebrief'
import Insights from './pages/Insights'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/triage" element={<EventTriage />} />
        <Route path="/allocator" element={<ConcurrentAllocator />} />
        <Route path="/debrief" element={<PostEventDebrief />} />
        <Route path="/insights" element={<Insights />} />
      </Routes>
    </BrowserRouter>
  )
}
