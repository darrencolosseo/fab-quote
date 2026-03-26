import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JobList from './pages/JobList'
import NewQuote from './pages/NewQuote'
import JobDetail from './pages/JobDetail'
import EditQuote from './pages/EditQuote'
import EmailTemplate from './pages/EmailTemplate'
import Toast from './components/Toast'

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/" element={<JobList />} />
        <Route path="/new" element={<NewQuote />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/job/:id/edit" element={<EditQuote />} />
        <Route path="/job/:id/email" element={<EmailTemplate />} />
      </Routes>
    </BrowserRouter>
  )
}
