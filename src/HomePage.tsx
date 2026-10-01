import { Link } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function HomePage() {
  return (
    <main className="wods">
      <AppHeader />
      <section className="wods__hero">
        <h1>Kode Athletics</h1>
        <p>Elige si quieres estimar un WOD o anotar los que ya has hecho.</p>
      </section>
      <div className="home__choices">
        <Link to="/simulador" className="home__choice">
          <strong>Simulador de WODs</strong>
          <span>Arma un for time o un AMRAP y mira el tiempo antes de hacerlo.</span>
        </Link>
        <Link to="/wods" className="home__choice">
          <strong>WODs y marcas</strong>
          <span>Crea WODs y guarda el tiempo o las repeticiones cada vez que los repites.</span>
        </Link>
      </div>
    </main>
  )
}
