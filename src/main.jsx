import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import RunningPlanView from './RunningPlanView.jsx'

// DEV-only clean running demo view: ?demo=<fixture-name> renders the generated plan in a
// running-first UI (design-principles), bypassing the Life Game app. Dead code in prod builds.
const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {demo ? <RunningPlanView name={demo} /> : <App />}
  </StrictMode>,
)
