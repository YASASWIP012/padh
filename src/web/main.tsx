import { render } from 'preact';
import './foundation.css';
import './app.css';
import { useRoute } from './router';
import { Landing } from './pages/Landing';
import { TryPage } from './pages/Try';
import { TeacherPage } from './pages/Teacher';
import { EvidencePage } from './pages/Evidence';
import { ConsentPage } from './pages/Consent';

function Nav() {
  return (
    <nav class="nav no-print">
      <div class="nav__bar">
        <a class="nav__brand" href="#/"><span class="brandmark">प</span>Padh</a>
        <div class="nav__links">
          <a href="#/try">Try it</a>
          <a href="#/teacher">Teachers</a>
          <a href="#/evidence">Evidence</a>
          <a href="https://github.com/YASASWIP012/padh" target="_blank" rel="noopener">Code</a>
        </div>
        <a class="btn btn-ink btn-sm" href="#/teacher">Start a class</a>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer class="footer no-print">
      <div class="container">
        <div class="row"><span class="tricolor" /><span>Padh · open source under MIT · built in <a href="https://github.com/YASASWIP012/padh/tree/main/agentfoundry" target="_blank" rel="noopener" style="text-decoration:underline;text-underline-offset:3px">AgentFoundry</a> for Code for a Billion 2026</span></div>
        <div class="row" style="gap:18px"><a href="#/evidence">Evidence</a><a href="#/consent">Consent form</a><a href="https://github.com/YASASWIP012/padh" target="_blank" rel="noopener">GitHub</a></div>
      </div>
    </footer>
  );
}

function App() {
  const [page, ...sub] = useRoute();
  let body;
  switch (page) {
    case 'try': body = <TryPage />; break;
    case 'teacher': body = <TeacherPage sub={sub} />; break;
    case 'evidence': body = <EvidencePage />; break;
    case 'consent': body = <ConsentPage />; break;
    default: body = null;
  }
  return (
    <>
      <Nav />
      {body ? <main class="app-main"><div class="container">{body}</div></main> : <main><Landing /></main>}
      <Footer />
    </>
  );
}

render(<App />, document.getElementById('app')!);
