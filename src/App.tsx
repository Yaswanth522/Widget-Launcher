import { Background } from './components/Background'
import { LauncherForm } from './components/LauncherForm'

function App() {
  return (
    <div className="relative min-h-screen">
      <Background />
      <main className="relative z-[2] flex min-h-screen items-center justify-center px-8 py-8">
        <LauncherForm />
      </main>
    </div>
  )
}

export default App
